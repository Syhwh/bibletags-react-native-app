import React from "react"
import { StyleSheet, View, Text, Dimensions } from "react-native"
import { Constants } from "expo"
// import { bindActionCreators } from "redux"
// import { connect } from "react-redux"
import { Container, Content } from "native-base"

import i18n from "../../utils/i18n.js"
import { unmountTimeouts } from "../../utils/toolbox.js"

import BackFunction from '../basic/BackFunction'
import FullScreenSpin from '../basic/FullScreenSpin'
import SearchHeader from '../major/SearchHeader'

const {
  APP_BACKGROUND_COLOR,
} = Constants.manifest.extra

const contentsStyles = {
}

class Search extends React.Component {

  constructor(props) {
    super(props)

    const { navigation } = props
    const { editOnOpen } = navigation.state.params

    this.state = {
      editing: !!editOnOpen,
    }
  }

  // componentDidMount() {
  //   AppState.addEventListener('change', this.handleAppStateChange)
  // }

  // componentWillUnmount = () => {
  //   AppState.removeEventListener('change', this.handleAppStateChange)
  //   unmountTimeouts.bind(this)()
  // }

  // handleAppStateChange = currentAppState => {
  //   this.setState({
  //     currentAppState,
  //   })
  // }

  setEditing = editing => this.setState({ editing })

  render() {

    const { navigation } = this.props
    const { editing } = this.state

    const { width } = Dimensions.get('window')

    return (
      <Container>
        <SearchHeader
          editing={editing}
          navigation={navigation}
          setEditing={this.setEditing}
          width={width}  // By sending this as a prop, I force a rerender
        />
        <Content>
          <View>
            <Text>Search Results</Text>
          </View>
        </Content>
      </Container>
    )
  }
}

export default Search
// const mapStateToProps = (state) => ({
//   // readerStatus: state.readerStatus,
// })

// const matchDispatchToProps = (dispatch, x) => bindActionCreators({
//   // setXapiConsentShown,
// }, dispatch)

// export default connect(mapStateToProps, matchDispatchToProps)(Search)