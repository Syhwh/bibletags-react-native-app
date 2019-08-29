import React from "react"
import { StyleSheet } from "react-native"
import Constants from "expo-constants"
import { bindActionCreators } from "redux"
import { connect } from "react-redux"

import i18n from "../../utils/i18n.js"
import { debounce } from "../../utils/toolbox.js"
import RecentBookmark from "./RecentBookmark"

import { removeRecentSearch } from "../../redux/actions.js"

const {
  RECENT_SEARCH_BACKGROUND_COLOR,
} = Constants.manifest.extra

const styles = StyleSheet.create({
  textBackground: {
    backgroundColor: RECENT_SEARCH_BACKGROUND_COLOR,
  },
  textBackgroundLowLight: {
    backgroundColor: 'rgba(103, 178, 245, 1)',
  },
})

class RecentSearch extends React.PureComponent {

  discard = () => {
    const { searchString, removeRecentSearch } = this.props

    removeRecentSearch({ searchString })
  }

  select = () => {
    const { navigation, searchString, versionId } = this.props

    debounce(
      navigation.navigate,
      "Search",
      {
        editOnOpen: false,
        searchString,
        versionId,
      }
    )
  }

  render() {
    const { searchString, displaySettings } = this.props

    const { theme } = displaySettings

    return (
      <RecentBookmark
        text={searchString}
        style={
          theme === 'low-light'
            ?
              styles.textBackgroundLowLight
            :
              styles.textBackground
        }
        discard={this.discard}
        select={this.select}
      />
    )
  }
}

const mapStateToProps = ({ displaySettings }) => ({
  displaySettings,
  // recentSearches,
})

const matchDispatchToProps = dispatch => bindActionCreators({
  removeRecentSearch,
}, dispatch)

export default connect(mapStateToProps, matchDispatchToProps)(RecentSearch)