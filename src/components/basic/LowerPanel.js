import React, { useMemo, useEffect } from "react"
import { StyleSheet, View, Platform } from "react-native"
import { useDimensions } from '@react-native-community/hooks'
import usePrevious from "react-use/lib/usePrevious"
import { BoxShadow } from 'react-native-shadow'

import useContentHeightManager from "../../hooks/useContentHeightManager"

import RevealContainer from "../basic/RevealContainer"
import LowerPanelOriginalWord from "./LowerPanelOriginalWord"
import LowerPanelTranslationWord from "./LowerPanelTranslationWord"
import LowerPanelFootnote from "./LowerPanelFootnote"
import LowerPanelVsComparison from "./LowerPanelVsComparison"

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 0,
    backgroundColor: 'white',
  },
  boxShadowContent: {
    backgroundColor: 'white',
    flex: 1,
  },
})

const LowerPanel = ({
  selectedData,
}) => {

  const previousSelectedData = usePrevious(selectedData)

  const { selectedSection, selectedVerse, selectedInfo, selectedVerseUsfm } = (selectedData.selectedSection ? selectedData : previousSelectedData) || {}
  const show = !!selectedData.selectedSection

  const { contentHeight, onSizeChangeFunctions, clearRecordedHeights } = useContentHeightManager(300)

  const { width: windowWidth, height: windowHeight } = useDimensions().window

  const containerStyle = useMemo(
    () => StyleSheet.flatten([
      styles.container,
      {
        height: Math.max(Math.min(contentHeight, windowHeight/2), 1),
      },
    ]),
    [ windowHeight, contentHeight ],
  )

  const shadowSetting = useMemo(
    () => ({
      width: windowWidth,
      height: containerStyle.height,
      color:"#000",
      border: 40,
      radius: 0,
      opacity: 0.08,
      x: 0,
      y: 0,
    }),
    [ windowHeight, containerStyle ],
  )

  let contents = null
  const { type: selectedInfoType, tag: selectedInfoTag } = selectedInfo || {}
  let contentsType

  if(selectedInfoType === 'word') {
    if(selectedInfoTag === 'w') {
      contents = (
        <LowerPanelOriginalWord
          selectedInfo={selectedInfo}
          onSizeChangeFunctions={onSizeChangeFunctions}
        />
      )
    } else {
      contents = (
        <LowerPanelTranslationWord
          selectedInfo={selectedInfo}
          selectedVerse={selectedVerse}
          selectedVerseUsfm={selectedVerseUsfm}
          onSizeChangeFunctions={onSizeChangeFunctions}
        />
      )
    }
    contentsType = 'word'

  } else if([ 'f', 'fe', 'x' ].includes(selectedInfoTag)) {
    contents = (
      <LowerPanelFootnote
        selectedSection={selectedSection}
        selectedInfo={selectedInfo}
        isCf={[ 'x' ].includes(selectedInfoTag)}
        onSizeChangeFunctions={onSizeChangeFunctions}
      />
    )
    contentsType = 'footnote'

  } else if(selectedVerse !== null) {
    contents = (
      <LowerPanelVsComparison
        selectedSection={selectedSection}
        selectedVerse={selectedVerse}
        onSizeChangeFunctions={onSizeChangeFunctions}
      />
    )
    contentsType = 'vscomparison'
  }

  useEffect(clearRecordedHeights, [ contentsType ])

  if(Platform.OS === 'android') {
    contents = (
      <BoxShadow setting={shadowSetting}>
        <View style={styles.boxShadowContent}>
          {contents}
        </View>
      </BoxShadow>
    )
  }

  return (
    <RevealContainer
      revealAmount={(show ? 0 : containerStyle.height)}
      immediateAdjustment={0}
      style={containerStyle}
      duration={100}
    >
      {contents}
    </RevealContainer>
  )
}

export default LowerPanel