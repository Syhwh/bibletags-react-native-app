require('dotenv').config()

const { S3Client } = require('@aws-sdk/client-s3')
const S3SyncClient = require('s3-sync-client')
const Database = require('better-sqlite3')
const { i18n, i18nNumber } = require("inline-i18n")
const { getWordsHash, getWordHashes, passOverI18n, passOverI18nNumber } = require("@bibletags/bibletags-ui-helper")
const { request, gql } = require('graphql-request')
const { exec } = require('child_process')

passOverI18n(i18n)
passOverI18nNumber(i18nNumber)

const s3Client = new S3Client({
  region: process.env.AWS_REGION || `us-east-1`,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
})
const { sync } = new S3SyncClient({ client: s3Client })

const goSyncVersions = async ({ stage, skipSubmitWordHashes }) => {

  try {

    const s3Dir = `s3://cdn.bibletags.org/tenants/${process.env.EMBEDDING_APP_ID}/${stage}/versions`
    const syncDir = `tenants/${process.env.TENANT_NAME}/versions`

    console.log(``)
    console.log(`Sync ${syncDir} to ${s3Dir}...`)

    const { uploads } = await sync(syncDir, s3Dir)

    uploads.forEach(({ path }) => {
      console.log(`  > updated ${path.slice(syncDir.length)}`)
    })

    if(!skipSubmitWordHashes) {

      if(stage === 'dev') {
        console.log(``)
        console.log(`  ** Starting \`bibletags-data\` to be able to submit word hashes locally...`)
        await new Promise(resolve => exec(`kill -9 $(lsof -i:8082 -t) 2> /dev/null`, resolve))  // make sure it isn't already running
        exec(`cd ../bibletags-data && npm start`)
        await new Promise(resolve => setTimeout(resolve, 1000))  // give it 1 second to start
      }

      const submitWordHashSetsFailingVersionIds = []

      for(let upload of uploads) {
        const { id, path } = upload
        const [ x1, embeddingAppId, stage, x2, versionId, x3, fileName ] = id.split('/')

        if(versionId === 'original') continue
        if(submitWordHashSetsFailingVersionIds.includes(versionId)) continue

        const bookId = parseInt(fileName.split('.')[0], 10)
        const uri = (
          process.env.BIBLETAGS_DATA_GRAPHQL_URI
          || (
            stage === 'dev'
              ? "http://localhost:8082/graphql"
              : "https://data.bibletags.org/graphql"
          )
        )

        if(bookId) {
          console.log(`  - submit word hash sets for bookId:${bookId} (${versionId})`)

          const db = new Database(path)
          const tableName = `${versionId}VersesBook${bookId}`

          const verses = db.prepare(`SELECT * FROM ${tableName}`).all()

          const input = verses.map(verse => {

            const { loc, usfm } = verse
            const params = {
              usfm,
            }

            const wordsHash = getWordsHash(params)
            const wordHashes = JSON.stringify(getWordHashes(params)).replace(/([{,])"([^"]+)"/g, '$1$2')

            return `{ loc: "${loc}", versionId: "${versionId}", wordsHash: "${wordsHash}", embeddingAppId: "${embeddingAppId}", wordHashes: ${wordHashes}}`

          })

          const inputInBlocks = [ input.slice(0, 100) ]
          for(let i=100; i<input.length; i+=100) {
            inputInBlocks.push(input.slice(i, i+100))
          }

          await Promise.all(inputInBlocks.map(async inputBlock => {

            const composedQuery = gql`
              mutation {
                submitWordHashesSets(input: [${inputBlock.join(',')}])
              }
            `

            try {
              await request(uri, composedQuery)
            } catch(err) {
              await new Promise(resolve => setTimeout(resolve, 1000))  // give it a second
              try {
                await request(uri, composedQuery)  // and try again
              } catch(err) {
                if(!submitWordHashSetsFailingVersionIds.includes(versionId)) {
                  submitWordHashSetsFailingVersionIds.push(versionId)
                }
                console.log(`    *** FAILED ***`)
              }
            }

          }))

        }

      }

      if(submitWordHashSetsFailingVersionIds.length > 0) {
        console.log(``)
        console.log(`!! THE FOLLOWING VERSION IDS FAILED TO SUBMIT WORD HASH SETS !!`)
        console.log(``)
        console.log(submitWordHashSetsFailingVersionIds.map(versionId => `  - ${versionId}`).join('\n'))
        console.log(``)
        console.log(`** Check Cloud Watch logs for why **`)
        console.log(``)
      }

      if(stage === 'dev') {
        await new Promise(resolve => exec(`kill -9 $(lsof -i:8082 -t) 2> /dev/null`, resolve))  // kills the npm start on /bibletags-data
      }

    }

    console.log(``)
    console.log(`  ...done with sync.`)
    console.log(``)

  } catch(err) {
    console.log(err)
  }

}

module.exports = goSyncVersions