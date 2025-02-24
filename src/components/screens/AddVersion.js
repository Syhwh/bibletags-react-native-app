import React, { useState } from "react"
import { StyleSheet, Text, Alert } from "react-native"
import { bindActionCreators } from "redux"
import { connect } from "react-redux"
import { List, Input } from "@ui-kitten/components"
import { i18n } from "inline-i18n"
import { getLanguageInfo } from "@bibletags/bibletags-ui-helper"

import useThemedStyleSets from "../../hooks/useThemedStyleSets"
import useBibleVersions from "../../hooks/useBibleVersions"
import { getVersionInfo, memo } from '../../utils/toolbox'

import SafeLayout from "../basic/SafeLayout"
import BasicHeader from "../major/BasicHeader"
import VersionItem from "../basic/VersionItem"

import { addBibleVersion } from "../../redux/actions"
import useEqualObjsMemo from "../../hooks/useEqualObjsMemo"
import useInstanceValue from "../../hooks/useInstanceValue"

const styles = StyleSheet.create({
  list: {
    paddingVertical: 10,
  },
  label: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    fontSize: 11,
    textAlign: 'left',  // needed so that it is flipped to right when rtl
  },
  input: {
    marginTop: 15,
    marginHorizontal: 15,
  },
  noneLeft: {
    padding: 50,
    fontSize: 18,
    textAlign: 'center',
    opacity: .5,
  },
})

const AddVersion = ({
  style,
  labelStyle,

  eva: { style: themedStyle={} },

  myBibleVersions,

  addBibleVersion,
}) => {

  const { baseThemedStyle, labelThemedStyle } = useThemedStyleSets(themedStyle)

  const { unusedVersionIds, versionIds } = useBibleVersions({ myBibleVersions })
  const getVersionIds = useInstanceValue(versionIds)

  const [ message, setMessage ] = useState(i18n("Tap to add"))
  const [ filterValue, setFilterValue ] = useState(``)

  const filteredUnusedVersionIds = useEqualObjsMemo(
    unusedVersionIds.filter(versionId => {
      const { name, abbr, languageId } = getVersionInfo(versionId)
      const { englishName, nativeName } = getLanguageInfo(languageId)
      const wordsToMatch = (
        [...new Set(
          [ name, abbr, languageId, englishName, nativeName ]
            .map(piece => piece.toLowerCase().split(' '))
            .flat()
        )]
      )
      return (
        filterValue
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
          .every((word, idx, ary) => (
            wordsToMatch.some(w => (
              idx === ary.length - 1
                ? w.indexOf(word) === 0
                : w === word
            ))
          ))
      )
    })
  )

  const renderItem = ({ item: versionId }) => (
    <VersionItem
      key={versionId}
      versionId={versionId}
      onPress={() => {
        if(getVersionIds().length > 20) {
          Alert.alert(
            i18n("Downloaded Bible Limit Reached"),
            i18n("You may not download more than 20 versions. Remove one or more downloaded versions in order to add others."),
          )
        } else {
          addBibleVersion({
            id: versionId,
            download: true,
          })
          setMessage(
            i18n("Added {{version}} to download queue", {
              version: getVersionInfo(versionId).abbr
            })
          )
        }
      }}
    />
  )

  return (
    <SafeLayout>
      <BasicHeader
        title={i18n("Add Bible Version")}
      />
      <Text
        style={[
          styles.label,
          labelThemedStyle,
          labelStyle,
        ]}
      >
        {message}
      </Text>
      {unusedVersionIds.length === 0 &&
        <Text style={styles.noneLeft}>
          {i18n("You have already downloaded all available versions.")}
        </Text>
      }
      {unusedVersionIds.length > 0 &&
        <>
          <Input
            style={styles.input}
            placeholder={i18n("Filter by name, language, or abbreviation")}
            value={filterValue}
            onChangeText={setFilterValue}
            allowFontScaling={false}
            autoCompleteType="off"
            autoCorrect={false}
            importantForAutofill="no"
            spellcheck={false}
          />
          <List
            style={[
              styles.list,
              baseThemedStyle,
              style,
            ]}
            data={filteredUnusedVersionIds}
            renderItem={renderItem}
          />
        </>
      }
    </SafeLayout>
  )

}

const mapStateToProps = ({ myBibleVersions }) => ({
  myBibleVersions,
})

const matchDispatchToProps = dispatch => bindActionCreators({
  addBibleVersion,
}, dispatch)

 export default memo(connect(mapStateToProps, matchDispatchToProps)(AddVersion), { name: 'AddVersion' })