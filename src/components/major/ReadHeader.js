import React from "react"
import { StyleSheet, View, Platform, TouchableOpacity } from "react-native"
import { Title, Subtitle, Left, Icon, Right, Button, Body } from "native-base"
import { bindActionCreators } from "redux"
import { connect } from "react-redux"

import i18n from "../../utils/i18n.js"
import { isPhoneSize, debounce, getVersionAbbr, getToolbarHeight } from '../../utils/toolbox.js'

import AppHeader from "../basic/AppHeader"
import { getPassageStr } from "bibletags-ui-helper"

const leftIconsWidth = 50
const rightIconsWidth = 135

const styles = StyleSheet.create({
  body: {
    ...(
      Platform.OS === 'ios' && isPhoneSize() ?
        {
          alignItems: 'flex-start',
          left: (leftIconsWidth - rightIconsWidth) / 2,
        }
        : {}
    ),
    ...(
      Platform.OS === 'android' && isPhoneSize() ?
        {
          marginLeft: -5,
          marginRight: -20,
        }
        : {}
    ),
  },
  subtitle: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  titles: {
    paddingRight: 34,
  },
  dropdownIcon: {
    position: 'absolute',
    right: 10,
    top: 0,
    fontSize: Platform.OS === 'ios' ? 18 : 22,
    lineHeight: getToolbarHeight() - (Platform.OS === 'ios' ? 24 : 0) - 6,  // 24 is the height of the status bar; 6 offsets it toward the top more
    ...(Platform.OS === 'ios' ? { color: '#bbbbbb' } : { color: 'rgba(255,255,255,.5)' }),
  },
})

console.log('getToolbarHeight()', getToolbarHeight())
class ReadHeader extends React.PureComponent {

  openDrawer = () => {
    const { navigation } = this.props

    debounce(navigation.openDrawer)
  }

  goSearch = () => {
    const { navigation } = this.props

    debounce(
      navigation.navigate,
      "SearchResults",
      {
        searchString: "love",
      }
    )
  }

  render() {
    let { passage, toggleShowOptions, showPassageChooser,
          hideStatusBar, width } = this.props

    width -= (leftIconsWidth + rightIconsWidth)

    const versionsText = [
      getVersionAbbr(passage.versionId),
      getVersionAbbr(passage.parallelVersionId || null),
    ]
      .filter(val => val)
      .join(i18n(", ", {}, "list separator"))
      .toUpperCase()

    const rtl = false  // TODO

    return (
      <AppHeader
        hideStatusBar={hideStatusBar}
      >
        <Left>
          <Button
            transparent
            onPressIn={this.openDrawer}
          >
            <Icon name="menu" />
          </Button>
        </Left>
        <Body style={[
          styles.body,
          (
            isPhoneSize()
              ? {
                width,
                minWidth: width,
                maxWidth: width,
              }
              : {}
          ),
        ]}>
          <TouchableOpacity
            onPressIn={showPassageChooser}
          >
            <View style={styles.titles}>
              <Title>
                {getPassageStr({
                  refs: [
                    passage.ref,
                  ],
                })}
              </Title>
              <Subtitle style={styles.subtitle}>
                {`${rtl ? `\u200F` : `\u200E`}${versionsText}`}
              </Subtitle>
              <Icon
                name="arrow-dropdown"
                style={styles.dropdownIcon}
              />
            </View>
          </TouchableOpacity>
        </Body>
        <Right>
          <Button
            transparent
            onPressIn={this.goSearch}
          >
            <Icon name="search" />
          </Button>
          <Button
            transparent
            onPressIn={toggleShowOptions}
          >
            <Icon name="more" />
          </Button>
        </Right>
      </AppHeader>
    )
  }
}

const mapStateToProps = ({ passage }) => ({
  passage,
})

const matchDispatchToProps = dispatch => bindActionCreators({
  // setRef,
}, dispatch)

export default connect(mapStateToProps, matchDispatchToProps)(ReadHeader)