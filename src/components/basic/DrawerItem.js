import React from "react"
import * as StoreReview from 'expo-store-review'
import { Image, StyleSheet, Linking } from "react-native"
import { ListItem, Body, Text } from "native-base"

import { i18n, getLocale } from "inline-i18n"
import { debounce } from "../../utils/toolbox.js"

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 0,
    paddingBottom: '50%',
    resizeMode: 'cover',
    backgroundColor: 'white',
  },
  listItem: {
    marginLeft: 0,
    paddingLeft: 10,
  },
  text: {
    textAlign: 'left',
  },
})

class DrawerItem extends React.PureComponent {

  changeLanguage = () => {
    const { navigation } = this.props

    debounce(
      navigation.navigate,
      "LanguageChooser",
    )
  }

  goVersions = () => {
    const { navigation } = this.props

    debounce(
      navigation.navigate,
      "Versions",
    )
  }

  goToURL = event => {
    let { type, href } = this.props

    if(type === 'rate') {
      href = StoreReview.storeUrl()
    }

    if(!href) return

    Linking.openURL(href).catch(err => {
      console.log('ERROR: Request to open URL failed.', err)
      navigation.navigate("ErrorMessage", {
        message: i18n("Your device is not allowing us to open this link."),
      })
    })
  }

  render() {
    const { text, image, imageWidth, imageHeight, onPress, type, href, locales } = this.props

    if(locales && !locales.includes(getLocale())) return null

    let typeAction, typeText

    switch(type) {
      case 'language': {
        typeText = i18n("Change app language")
        typeAction = this.changeLanguage
        break
      }
      case 'rate': {
        typeText = i18n("Rate this app")
        typeAction = this.goToURL
        break
      }
      case 'versions': {
        typeText = i18n("Bible version information")
        typeAction = this.goVersions
        break
      }
    }

    return (
      <ListItem
        {...((onPress || typeAction || href)
          ? {
            button: true,
            onPress: onPress || typeAction || this.goToURL,
          }
          : {}
        )}
        style={styles.listItem}
      >
        <Body>
          {!!(text || typeText) &&
            <Text style={styles.text}>{text || typeText}</Text> 
          }
          {!!image &&
            <Image
              source={image}
              style={[
                styles.image,
                {
                  width: imageWidth,
                  paddingBottom: imageHeight,
                },
              ]}
            />
          }
        </Body>
      </ListItem>
    )
  }
}

export default DrawerItem
