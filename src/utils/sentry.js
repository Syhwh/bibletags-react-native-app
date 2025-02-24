import * as Sentry from 'sentry-expo'

let { init } = Sentry
let { captureException, captureMessage } = Sentry.Native
if(__DEV__) {
  init = () => {}
  captureException = err => console.log(err)
  captureMessage = message => console.log(message)
}

export { init, captureException, captureMessage }