import { i18n } from "inline-i18n"

import { executeSql, doGraphql, sentry, getAsyncStorage } from './toolbox'
import { tagSetUpdateFields, updateDBWithTagSets } from "./updateTagSets"
import { indicatedVersesTagged } from "../hooks/useTagAnotherVerse"

const noop = () => {}

export const getTagSubmissionId = ({ loc, versionId, wordsHash }) => `${loc}-${versionId}-${wordsHash}`

export const recordAndSubmitTagSet = async ({ input, historyPush }) => {

  // record in db
  await executeSql({
    database: `submittedTagSets`,
    statement: () => `REPLACE INTO submittedTagSets (id, input, submitted) VALUES ?`,
    args: [
      [
        getTagSubmissionId(input),
        JSON.stringify(input),
        0,
      ],
    ],
  })
  indicatedVersesTagged(input)

  return submitTagSet({ input, historyPush })
}

const submitTagSet = async ({ input, historyPush=noop }) => {
  try {

    const { versionId } = input
    const updatedFromKey = `versions/${versionId}/tagSets-updatedFrom`
    const updatedFrom = await getAsyncStorage(updatedFromKey, 0)

    const { submitTagSet: updatedTagSets } = await doGraphql({
      mutation: `
        submitTagSet() {
          ${tagSetUpdateFields}
        }
      `,
      params: {
        input,
        updatedFrom,
      },
    })

    await updateDBWithTagSets({ updatedTagSets, versionId, updatedFrom })
    console.log(`${updatedTagSets.tagSets.length} tag sets updated for ${versionId}.`)

    // update tag set submission in db
    await executeSql({
      database: `submittedTagSets`,
      statement: () => `UPDATE submittedTagSets SET submitted=1 WHERE id=?`,
      args: [
        getTagSubmissionId(input),
      ],
    })

    return {
      success: true,
    }

  } catch(error) {

    if(![ `Network request failed` ].includes(error.message)) {
      sentry({ error })
      return {
        success: false,
        error: i18n("Unable to submit tag set. Contact us if this problem persists."),
      }
    }

    return {
      success: false,
    }

  }
}

export default submitTagSet