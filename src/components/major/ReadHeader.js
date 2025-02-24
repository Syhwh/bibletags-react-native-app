import React, { useCallback, useMemo, useState } from "react"
import { StyleSheet, TouchableWithoutFeedback, I18nManager, View, Text } from "react-native"
import * as Clipboard from 'expo-clipboard'
import { bindActionCreators } from "redux"
import { connect } from "react-redux"
import { i18n } from "inline-i18n"
import { getPassageStr } from "@bibletags/bibletags-ui-helper"

import useThemedStyleSets from "../../hooks/useThemedStyleSets"
import { getVersionInfo } from "../../utils/toolbox"
import useRouterState from "../../hooks/useRouterState"
import useSetTimeout from "../../hooks/useSetTimeout"
import { isIPhoneX, iPhoneXInset, readHeaderMarginTop, readHeaderHeight, memo, isPhoneSize } from "../../utils/toolbox"

import AppHeader from "../basic/AppHeader"
import GradualFade from "../basic/GradualFade"
import HeaderIconButton from "../basic/HeaderIconButton"
import Icon from "../basic/Icon"

const phoneSize = isPhoneSize()

const isAndroidRTL = I18nManager.isRTL && Platform.OS === 'android'

const passageAndVersion = {
  [isAndroidRTL ? `paddingLeft` : `paddingRight`]: 7,
  fontSize: 16,
}

const styles = StyleSheet.create({
  gradualFade: {
    ...StyleSheet.absoluteFillObject,
    bottom: 'auto',
    top: 26,
    zIndex: 2,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    minHeight: readHeaderHeight,
    height: readHeaderHeight,
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: readHeaderMarginTop,
    marginHorizontal: 15,
    borderRadius: 4,
    elevation: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: "black",
    shadowOpacity: 0.3,
    shadowRadius: 15,
    borderBottomWidth: 0,
  },
  headerTablet: {
    left: 'auto',
    right: 'auto',
    width: 350,
    alignSelf: 'center',
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
    alignItems: 'center',
    marginRight: 15,
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
    fontWeight: '500',
  },
  version: {
    textAlign: 'left',
    writingDirection: 'ltr',
    fontSize: 13,
  },
  dropdownIcon: {
    height: 18,
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
  selectedData,
  clearSelectedInfo,
  style,
  iconStyle,

  eva: { style: themedStyle={} },

  passage,
}) => {

  const { selectedVerse, selectedTextContent } = selectedData

  const [ showCopied, setShowCopied ] = useState(false)

  const { historyPush } = useRouterState()
  const { baseThemedStyle, iconThemedStyle } = useThemedStyleSets(themedStyle)

  const [ setShowResultTimeout ] = useSetTimeout()

  const goSearch = useCallback(
    () => {
      historyPush("/Read/Search")
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
    .join(i18n(", ", "list separator"))

  const passageStr = useMemo(
    () => (
      getPassageStr({
        refs: [
          {
            ...passage.ref,
            verse: selectedVerse === -1 ? null : selectedVerse,
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

      {selectedVerse == null &&
        <AppHeader
          hideStatusBar={hideStatusBar}
          style={[
            styles.header,
            !phoneSize ? styles.headerTablet : null,
          ]}
        >
          <HeaderIconButton
            name="md-menu"
            onPress={openSideMenu}
          />
          <TouchableWithoutFeedback
            onPressIn={showPassageChooser}
          >
            <View style={styles.middle}>
              <Text
                style={styles.passageAndVersion}
                allowFontScaling={false}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
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
            style={isAndroidRTL ? styles.rightIcon : styles.leftIcon}
          />
          <HeaderIconButton
            name="format-size"
            pack="materialCommunity"
            onPress={toggleShowOptions}
            style={isAndroidRTL ? styles.leftIcon : styles.rightIcon}
          />
        </AppHeader>
      }

      {selectedVerse != null &&
        <AppHeader
          hideStatusBar={hideStatusBar}
          style={[
            styles.header,
            !phoneSize ? styles.headerTablet : null,
          ]}
          uiStatus="selected"
        >
          <HeaderIconButton
            name="window-close"
            pack="materialCommunity"
            style={styles.closeIcon}
            onPress={clearSelectedInfo}
          />
          <View style={styles.middle}>
            <Text
              style={styles.whitePassageAndVersion}
              allowFontScaling={false}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
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
          {selectedVerse !== -1 &&
            <HeaderIconButton
              name={showCopied ? "check" : "content-copy"}
              pack="materialCommunity"
              onPress={showCopied ? null : copyVerse}
              uiStatus={showCopied ? 'disabled' : null}
              style={styles.whiteIcon}
            />
          }
        </AppHeader>
      }

    </>
  )

})

const mapStateToProps = ({ passage }) => ({
  passage,
})

const matchDispatchToProps = dispatch => bindActionCreators({
  // setRef,
}, dispatch)

export default memo(connect(mapStateToProps, matchDispatchToProps)(ReadHeader), { name: 'ReadHeader' })