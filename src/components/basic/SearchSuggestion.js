import React from "react"
import { View, StyleSheet, Text } from "react-native"
import { ListItem, Body, Right } from "native-base"

import { debounce, getVersionInfo, isRTL } from '../../utils/toolbox.js'
import { RTL } from "../../../language.js"
import i18n from "../../utils/i18n.js"

import RelativeTime from "./RelativeTime"

const styles = StyleSheet.create({
  searchString: {
    fontWeight: '700',
    fontSize: 16,
  },
  line: {
    ...(RTL ? { flexDirection: 'row-reverse' } : {}),
  },
  secondLine: {
    flexDirection: RTL ? 'row-reverse' : 'row',
    marginTop: 2,
  },
  versionAbbr: {
    fontWeight: '400',
    fontSize: 12,
  },
  subtitleView: {
    flex: RTL ? 0 : 1,
  },
  timeView: {
    flex: RTL ? 1 : 0,
  },
  subtitle: {
    color: 'rgba(0, 0, 0, .6)',
    fontSize: 13,
  },
  time: {
    fontSize: 13,
  },
})

class SearchSuggestion extends React.PureComponent {

  goSearch = () => {
    const { navigation, searchString, versionId, setEditing, updateEditedSearchString } = this.props

    updateEditedSearchString(searchString)
    setEditing(false)

    debounce(
      navigation.setParams,
      {
        ...navigation.state.params,
        searchString,
        versionId,
        editOnOpen: false,
      },
    )
  }

  render() {
    const { searchString, versionId, lastViewTime, numberResults } = this.props

    const { abbr, languageId } = getVersionInfo(versionId)

    return (
      <ListItem
        button={true}
        onPress={this.goSearch}
      >
        <Body>
          <View style={styles.line}>
            <Text style={styles.searchString}>
              {RTL ? `\u2067`: `\u2066`}
              {i18n("“{{searchString}}”", {
                searchString: isRTL(languageId) ? `\u2067${searchString}\u2069` : `\u2066${searchString}\u2069`,
              })}
              {`  `}
              <Text style={styles.versionAbbr}>{abbr}</Text>
            </Text>
          </View>
          <View style={styles.secondLine}
          >
            <View style={styles.subtitleView}>
              <Text style={styles.subtitle}>{i18n("{{num_results}} result(s)", { num_results: numberResults })}</Text>
            </View>
            <View style={styles.timeView}>
              <RelativeTime
                style={styles.time}
                time={lastViewTime}
              />
            </View>
          </View>
        </Body>
      </ListItem>
    )
  }
}

export default SearchSuggestion