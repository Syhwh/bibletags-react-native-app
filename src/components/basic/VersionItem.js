import React, { useEffect, useRef, useMemo, useCallback } from "react"
import { StyleSheet, View, TouchableOpacity, TouchableWithoutFeedback, Platform, Text, Animated, Easing } from "react-native"
import { Tooltip, OverflowMenu, MenuItem } from "@ui-kitten/components"
import useToggle from "react-use/lib/useToggle"
import { i18n } from "inline-i18n"
import { getLanguageInfo } from "@bibletags/bibletags-ui-helper"

import useThemedStyleSets from "../../hooks/useThemedStyleSets"
import useNetwork from "../../hooks/useNetwork"
import { getVersionInfo, memo } from "../../utils/toolbox"

import Icon from "../basic/Icon"
import Spin from "../basic/Spin"

const styles = StyleSheet.create({
  version: {
    flex: 1,
  },
  abbr: {
    fontWeight: 'bold',
    textAlign: 'left',
  },
  name: {
    textAlign: 'left',
    flex: 1,
    fontWeight: '300',
    fontSize: 13,
  },
  language: {
    textAlign: 'left',
    flex: 1,
    fontSize: 13,
    writingDirection: 'ltr',
  },
  offlineIcon: {
    height: 20,
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  downloadedIcon: {
    height: 20,
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  tooltip: {
    maxWidth: 270,
  },
  optionsIcon: {
    height: 20,
    paddingVertical: 5,
    paddingHorizontal: 15,
    marginRight: -10,
  },
  container: {
    flexDirection: 'row',
    marginLeft: 0,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  active: {
    shadowOffset: { width: 2, height: 2 },
    shadowColor: "black",
    shadowOpacity: 0.2,
  },
  spin: {
    marginVertical: 5,
    width: 30,
  },
})

const VersionItem = ({
  versionId,
  reorderable,
  reordering,
  active,
  options,
  downloading,
  downloaded,

  style,
  labelStyle,
  nameStyle,
  languageStyle,
  iconStyle,
  offlineIconStyle,
  downloadedIconStyle,

  eva: { style: themedStyle={} },

  ...otherProps
}) => {

  const { baseThemedStyle, labelThemedStyle, iconThemedStyle, altThemedStyleSets } = useThemedStyleSets(themedStyle)
  const [
    nameThemedStyle={},
    languageThemedStyle={},
    offlineIconThemedStyle={},
    downloadedIconThemedStyle={},
  ] = altThemedStyleSets

  const { online } = useNetwork()

  const { name, abbr, languageId } = getVersionInfo(versionId)
  const languages = []
  languageId.split('+').forEach(lId => {
    const { englishName, nativeName } = getLanguageInfo(lId)
    languages.push(
      englishName === nativeName
        ? nativeName
        : (
          i18n("{{language}} ({{language_english_name}})", {
            language: nativeName,
            language_english_name: englishName,
          })
        )
    )
  })
  const language = languages.filter(Boolean).join(i18n(", ", "list separator"))

  const [ menuOpen, toggleMenuOpen ] = useToggle()
  const [ showTooltipOffline, toggleShowTooltipOffline ] = useToggle()
  const [ showTooltipDownloaded, toggleShowTooltipDownloaded ] = useToggle()

  const animation = useRef(new Animated.Value(0))

  const sortStyle = useMemo(
    () => {
      if(!reorderable) return

      return {
        ...Platform.select({
          ios: {
            transform: [{
              scale: animation.current.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.05],
              }),
            }],
            shadowRadius: animation.current.interpolate({
              inputRange: [0, 1],
              outputRange: [2, 10],
            }),
          },

          android: {
            transform: [{
              scale: animation.current.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.05],
              }),
            }],
            elevation: animation.current.interpolate({
              inputRange: [0, 1],
              outputRange: [2, 6],
            }),
          },
        })
      }
    },
    [ reorderable ],
  )

  useEffect(
    () => {
      if(!reorderable) return

      Animated.timing(animation.current, {
        duration: 300,
        easing: Easing.bounce,
        toValue: Number(active),
        useNativeDriver: true,
      }).start()  
    },
    [ reorderable, active ],
  )

  const onOptionSelect = useCallback(
    ({ row }) => {
      toggleMenuOpen(false)
      options[row].onPress()
    },
    [ options ],
  )

  const renderTooltipOfflineAnchor = useCallback(
    () => (
      <TouchableWithoutFeedback
        onPress={toggleShowTooltipOffline}
        disabled={reordering}
      >
        <Icon
          style={[
            styles.offlineIcon,
            offlineIconThemedStyle,
            offlineIconStyle,
          ]}
          name="cloud-off-outline"
          pack="materialCommunity"
          uiStatus={reordering ? `disabled` : `unselected`}
        />
      </TouchableWithoutFeedback>
    ),
    [ toggleShowTooltipOffline, reordering, styles, offlineIconThemedStyle, offlineIconStyle ],
  )

  const renderTooltipDownloadedAnchor = useCallback(
    () => (
      <TouchableWithoutFeedback
        onPress={toggleShowTooltipDownloaded}
        disabled={reordering}
      >
        <Icon
          style={[
            styles.downloadedIcon,
            downloadedIconThemedStyle,
            downloadedIconStyle,
          ]}
          name={"check-underline-circle"}
          pack="materialCommunity"
          uiStatus={reordering ? `disabled` : `unselected`}
        />
      </TouchableWithoutFeedback>
    ),
    [ toggleShowTooltipDownloaded, reordering, styles, downloadedIconThemedStyle, downloadedIconStyle ],
  )

  const renderOverflowMenuAnchor = useCallback(
    () => (
      <TouchableOpacity
        onPress={toggleMenuOpen}
        disabled={reordering}
      >
        <Icon
          style={[
            styles.optionsIcon,
            iconThemedStyle,
            iconStyle,
          ]}
          name={"md-more"}
          uiStatus={reordering ? `disabled` : `unselected`}
        />
      </TouchableOpacity>
    ),
    [ toggleMenuOpen, reordering, styles, iconThemedStyle, iconStyle ],
  )

  const contents = (
    <View
      style={[
        styles.container,
        baseThemedStyle,
        style,
      ]}
    >
      <View style={styles.version}>
        <Text
          style={[
            styles.abbr,
            labelThemedStyle,
            labelStyle,
          ]}
        >
          {abbr}
        </Text>
        <Text style={[
          styles.name,
          nameThemedStyle,
          nameStyle,
        ]}>
          {name}
        </Text>
        <Text style={[
          styles.language,
          languageThemedStyle,
          languageStyle,
        ]}>
          {language}
        </Text>
      </View>
      {downloading && !online &&
        <View>
          <Tooltip
            visible={showTooltipOffline}
            onBackdropPress={toggleShowTooltipOffline}
            anchor={renderTooltipOfflineAnchor}
            style={styles.tooltip}
          >
            {i18n("You are offline. This version will download next time you connect.")}
          </Tooltip>
        </View>
      }
      {downloading && online &&
        <View>
          <Spin
            style={styles.spin}
            size="small"
          />
        </View>
      }
      {downloaded &&
        <View>
          <Tooltip
            visible={showTooltipDownloaded}
            onBackdropPress={toggleShowTooltipDownloaded}
            anchor={renderTooltipDownloadedAnchor}
            style={styles.tooltip}
          >
            {i18n("Available offline")}
          </Tooltip>
        </View>
      }
      {(options || []).length > 0 &&
        <View>
          <OverflowMenu
            visible={menuOpen}
            onSelect={onOptionSelect}
            onBackdropPress={toggleMenuOpen}
            anchor={renderOverflowMenuAnchor}
          >
            {options.map(({ title }) => (
              <MenuItem
                key={title}
                title={title}
              />
            ))}
          </OverflowMenu>
        </View>
      }
    </View>
  )

  if(reorderable) {
    return (
      <Animated.View
        style={[
          active ? styles.active : null,
          sortStyle,
        ]}>
        {contents}
      </Animated.View>
    )
  }

  return (
    <TouchableOpacity
      {...otherProps}
    >
      {contents}
    </TouchableOpacity>
  )

}

export default memo(VersionItem, { name: 'VersionItem' })
