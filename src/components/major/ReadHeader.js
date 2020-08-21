import React, { useCallback, useMemo, useState } from "react"
import { StyleSheet, TouchableWithoutFeedback, I18nManager, View, Text, Clipboard } from "react-native"
import { bindActionCreators } from "redux"
import { connect } from "react-redux"
import { i18n } from "inline-i18n"
import { getPassageStr } from "bibletags-ui-helper"
import { styled } from "@ui-kitten/components"

import useThemedStyleSets from "../../hooks/useThemedStyleSets"
import { getVersionInfo } from "../../utils/toolbox"
import useRouterState from "../../hooks/useRouterState"
import useSetTimeout from "../../hooks/useSetTimeout"
import { isIPhoneX, iPhoneXInset, readHeaderMarginTop, readHeaderHeight } from "../../utils/toolbox"

import AppHeader from "../basic/AppHeader"
import GradualFade from "../basic/GradualFade"
import HeaderIconButton from "../basic/HeaderIconButton"
import Icon from "../basic/Icon"

const passageAndVersion = {
  paddingRight: 7,
  lineHeight: readHeaderHeight,
}

const header = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  minHeight: readHeaderHeight,
  height: readHeaderHeight,
  paddingTop: 0,
  marginTop: readHeaderMarginTop,
  marginHorizontal: 15,
  borderRadius: 4,
  elevation: 4,
  shadowOffset: { width: 0, height: 0 },
  shadowColor: "black",
  shadowOpacity: 0.3,
  shadowRadius: 15,
  borderBottomWidth: 0,
}

const styles = StyleSheet.create({
  gradualFade: {
    ...StyleSheet.absoluteFillObject,
    bottom: 'auto',
    top: 26,
    zIndex: 2,
  },
  header: {
    ...header,
  },
  selectionHeader: {
    ...header,
    backgroundColor: 'black',
  },
  closeIcon: {
    tintColor: 'white',
    paddingHorizontal: 13,
  },
  whiteIcon: {
    tintColor: 'white',
  },
  middle: {
    flex: 1,
    flexDirection: 'row',
  },
  passageAndVersion: {
    ...passageAndVersion,
  },
  whitePassageAndVersion: {
    ...passageAndVersion,
    color: 'white',
  },
  passage: {
    textAlign: 'left',
    fontSize: 14,
    fontWeight: '500',
  },
  version: {
    textAlign: 'left',
    writingDirection: 'ltr',
    fontSize: 11,
  },
  dropdownIcon: {
    height: 18,
    lineHeight: readHeaderHeight,
  },
  leftIcon: {
    paddingRight: 8,
  },
  rightIcon: {
    paddingLeft: 8,
  },
})

const ReadHeader = React.memo(({
  toggleShowOptions,
  showPassageChooser,
  showingPassageChooser,
  hideStatusBar,
  selectedInfo,
  clearSelectedInfo,
  style,
  iconStyle,

  themedStyle,

  passage,
}) => {

  const { selectedVerse, selectedTextContent } = selectedInfo

  const [ showCopied, setShowCopied ] = useState(false)

  const { historyPush } = useRouterState()
  const { baseThemedStyle, iconThemedStyle } = useThemedStyleSets(themedStyle)

  const [ setShowResultTimeout ] = useSetTimeout()

  const goSearch = useCallback(
    () => {
      historyPush("/Read/Search", {
        editOnOpen: true,
        versionId: passage.versionId,
      })
    },
    [ passage ],
  )

  const openSideMenu = useCallback(() => historyPush("./SideMenu"), [])

  const copyVerse = useCallback(
    () => {
      Clipboard.setString(selectedTextContent)

      setShowCopied(true)
      setShowResultTimeout(() => setShowCopied(false), 1000)
    },
    [ selectedTextContent ],
  )

  const versionsText = [
    getVersionInfo(passage.versionId).abbr,
    getVersionInfo(passage.parallelVersionId || null).abbr,
  ]
    .filter(val => val)
    .join(i18n(", ", "list separator", {}))
    .toUpperCase()

  const passageStr = useMemo(
    () => (
      getPassageStr({
        refs: [
          {
            ...passage.ref,
            verse: selectedVerse,
          },
        ],
      })
    ),
    [ passage.ref, selectedVerse ],
  )

  const versionsStr = `${I18nManager.isRTL ? `\u2067` : `\u2066`}${versionsText}`

  return (
    <>
      {isIPhoneX &&
        <GradualFade
          height={iPhoneXInset['portrait'].topInset + 5}
          style={styles.gradualFade}
        />
      }

      {!selectedVerse && <>
        <AppHeader
          hideStatusBar={hideStatusBar}
          style={styles.header}
        >
          <HeaderIconButton
            name="md-menu"
            onPress={openSideMenu}
          />
          <TouchableWithoutFeedback
            onPressIn={showPassageChooser}
          >
            <View style={styles.middle}>
              <Text style={styles.passageAndVersion}>
                <Text style={styles.passage}>
                  {passageStr}
                </Text>
                {`  `}
                <Text
                  style={[
                    styles.version,
                    baseThemedStyle,
                    style,
                  ]}
                >
                  {versionsStr}
                </Text>
              </Text>
              <Icon
                name={showingPassageChooser ? `md-arrow-dropup` : `md-arrow-dropdown`}
                style={[
                  styles.dropdownIcon,
                  iconThemedStyle,
                  iconStyle,
                ]}
              />
            </View>
          </TouchableWithoutFeedback>
          <HeaderIconButton
            name="md-search"
            onPress={goSearch}
            style={styles.leftIcon}
          />
          <HeaderIconButton
            name="format-size"
            pack="materialCommunity"
            onPress={toggleShowOptions}
            style={styles.rightIcon}
          />
        </AppHeader>
      </>}

      {!!selectedVerse && <>
        <AppHeader
          hideStatusBar={hideStatusBar}
          style={styles.selectionHeader}
        >
          <HeaderIconButton
            name="window-close"
            pack="materialCommunity"
            style={styles.closeIcon}
            onPress={clearSelectedInfo}
          />
          <View style={styles.middle}>
            <Text style={styles.whitePassageAndVersion}>
              <Text style={styles.passage}>
                {passageStr}
              </Text>
              {`  `}
              <Text
                style={[
                  styles.version,
                  baseThemedStyle,
                  style,
                ]}
              >
                {versionsStr}
              </Text>
            </Text>
          </View>
          <HeaderIconButton
            name={showCopied ? "check" : "content-copy"}
            pack="materialCommunity"
            onPress={showCopied ? null : copyVerse}
            uiStatus={showCopied ? 'disabled' : null}
            style={styles.whiteIcon}
          />
        </AppHeader>
      </>}

    </>
  )

})

const mapStateToProps = ({ passage }) => ({
  passage,
})

const matchDispatchToProps = dispatch => bindActionCreators({
  // setRef,
}, dispatch)

ReadHeader.styledComponentName = 'ReadHeader'

export default styled(connect(mapStateToProps, matchDispatchToProps)(ReadHeader))