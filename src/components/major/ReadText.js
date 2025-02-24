import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import Constants from "expo-constants"
import { View, FlatList, StyleSheet, Platform, TouchableWithoutFeedback } from "react-native"
import { bindActionCreators } from "redux"
import { connect } from "react-redux"
import { getPiecesFromUSFM, blockUsfmMarkers, tagInList, adjustPiecesForSpecialHebrew, adjustTextForSups,
         removeCantillation, getCopyVerseText, getColorWithOpacity } from "@bibletags/bibletags-ui-helper"
import usePrevious from "react-use/lib/usePrevious"
import { useDimensions } from "@react-native-community/hooks"
import { useWindowDimensions } from 'react-native'

import useThemedStyleSets from "../../hooks/useThemedStyleSets"
import { executeSql, getVersionInfo, isIPhoneX, equalObjs, getNormalizedTag,
         iPhoneXInset, readHeaderHeight, readHeaderMarginTop, memo, getTagStyle } from '../../utils/toolbox'
import { adjustChildrenAndGetStyles } from '../../utils/textStyles'
import bibleVersions from "../../../versions"
import useInstanceValue from "../../hooks/useInstanceValue"

import VerseText from "../basic/VerseText"
import CoverAndSpin from "../basic/CoverAndSpin"
import useComponentUnloadedRef from "../../hooks/useComponentUnloadedRef"

const {
  MAX_AVG_PARAGRAPH_LENGTH_IN_VERSES=10,
  MAX_PARAGRAPH_LENGTH_IN_VERSES=15,
} = Constants.manifest.extra

const viewStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    maxWidth: "100%",
    alignSelf: 'center',
    paddingBottom: 20,
    paddingTop: (
      Platform.OS === 'android'
        ? 65
        : (76 + (
          isIPhoneX
            ? iPhoneXInset['portrait'].topInset
            : 0
        ))
    ),
  },
  parallelContent: {
    paddingTop: 20,
  },
  block: {
    paddingHorizontal: 20,
  },
  mt: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  mte: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  ms: {
    paddingTop: 7,
    paddingBottom: 5,
  },
  mr: {
    marginTop: -7,
    paddingBottom: 7,
  },
  s: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  s2: {
    paddingTop: 10,
    paddingBottom: 5,
  },
  s3: {
    paddingTop: 5,
    paddingBottom: 5,
  },
  sr: {
    marginTop: -7,
    paddingBottom: 5,
  },
  r: {
    marginTop: -7,
    paddingBottom: 5,
  },
  sp: {
    paddingTop: 10,
    paddingBottom: 5,
    paddingHorizontal: 20,
  },
  d: {
    paddingTop: 5,
    paddingBottom: 12,
  },
  sd: {
    height: 20,
  },
  sd2: {
    height: 30,
  },
  sd3: {
    height: 40,
  },
  p: {
    paddingTop: 5,
    paddingBottom: 5,
  },
  m: {
    paddingTop: 5,
    paddingBottom: 5,
  },
  q: {
    paddingLeft: 20,
  },
  q2: {
    paddingLeft: 40,
  },
  q3: {
    paddingLeft: 60,
  },
  q4: {
    paddingLeft: 80,
  },
  q5: {
    paddingLeft: 100,
  },
  q6: {
    paddingLeft: 120,
  },
  q7: {
    paddingLeft: 140,
  },
  b: {
    height: 10,
  },
  qd: {
    paddingTop: 20,
  },
  qa: {
    paddingTop: 20,
    paddingBottom: 5,
    paddingHorizontal: 20,
  },
  // sup: {
  //   position: "relative",
  //   top: "-0.3em",
  // },
})

const noop = () => {}

const ReadText = ({
  versionId,
  passageRef,
  selectedVerse,
  selectedInfo,
  selectedTagInfo,
  focussedVerse,
  isVisible,
  isParallel,
  forwardRef,
  onContentSizeChange,
  onLoaded,
  onVerseTap,
  onScroll,
  onTouchStart,
  onTouchEnd,
  onLayout,
  height,
  reportNumberOfVerses,
  waitOnInitialRender,
  setIsRendered=noop,

  eva: { style: themedStyle={} },

  displaySettings,
}) => {

  const waitOnRender = useRef(waitOnInitialRender)
  waitOnRender.current = waitOnRender.current && waitOnInitialRender

  const hasBeenVisible = useRef(isVisible)
  hasBeenVisible.current = hasBeenVisible.current || isVisible

  const { width: windowWidth, height: windowHeight } = useDimensions().window
  const { altThemedStyleSets } = useThemedStyleSets(themedStyle)
  const [

    unfocussedBlockThemedStyle={},
    unfocussedThemedStyle={},
    unselectedBlockThemedStyle={},
    unselectedThemedStyle={},
    semiSelectedVsThemedStyle={},
    selectedWordThemedStyle={},
    selectedVsThemedStyle={},
    matchThemedStyle={},  // used in Verse
    usedWordThemedStyle={},  // used in Verse

    ...tagThemedStyles

  ] = altThemedStyleSets

  const { fontScale } = useWindowDimensions()

  const [ state, setState ] = useState({})
  const { pieces, languageId, isOriginal } = state

  const { bookId, chapter } = passageRef

  const verses = useRef()
  const contentSizeParams = useRef()
  const blockIdxByVerse = useRef([0])

  const previousSelectedVerse = usePrevious(selectedVerse)
  const previousFocussedVerse = usePrevious(focussedVerse)

  const unloaded = useComponentUnloadedRef()

  useEffect(
    () => {
      if(pieces && onLoaded) {
        onLoaded()
      }
    },
    [ pieces ],
  )

  useEffect(
    () => {
      (async () => {

        if(!bookId) return  // adjacent to beginning or end of Bible
        if(!bibleVersions.some(({ id }) => id === versionId)) return  // failsafe

        const { rows: { _array: vss } } = await executeSql({
          versionId,
          bookId,
          statement: () => `SELECT * FROM ${versionId}VersesBook${bookId} WHERE loc LIKE ? ORDER BY loc`,
          args: [
            `${('0'+bookId).slice(-2)}${('00'+chapter).slice(-3)}%`,
          ],
        })

        if(unloaded.current) return

        // cut up extra-long paragraphs for performance reasons
        const blockUsfmMarkerRegex = new RegExp(`\\\\(?:${blockUsfmMarkers.join('|').replace(/#/g, '[0-9]*')})`, 'g')
        const numBlocks = (vss.map(({ usfm }) => usfm).join('\n').match(blockUsfmMarkerRegex) || []).length
        const exceedsMaxAvg = vss.length / numBlocks > MAX_AVG_PARAGRAPH_LENGTH_IN_VERSES
        let verseIdxWithLastParagraphBreak = -1
        vss.forEach((verse, idx) => {
          if(
            (
              idx - verseIdxWithLastParagraphBreak >= MAX_PARAGRAPH_LENGTH_IN_VERSES
              || (
                exceedsMaxAvg
                && idx - verseIdxWithLastParagraphBreak >= MAX_AVG_PARAGRAPH_LENGTH_IN_VERSES
              )
            )
            && !blockUsfmMarkerRegex.test(verse.usfm)
          ) {
            verse.usfm = `\\nb\n${verse.usfm}`
          }
          if(blockUsfmMarkerRegex.test(verse.usfm)) {
            verseIdxWithLastParagraphBreak = idx
          }
        })

        verses.current = vss

        reportNumberOfVerses && reportNumberOfVerses(vss.length)

        const { wordDividerRegex, languageId, isOriginal=false } = getVersionInfo(versionId)

        const pieces = getPiecesFromUSFM({
          usfm: vss.map(({ usfm }) => usfm).join('\n'),
          wordDividerRegex,
          splitIntoWords: versionId !== 'original',
        })

        setState({
          pieces,
          languageId,
          isOriginal,
        })

      })()
    },
    [],
  )

  const fireOnContentSizeChange = useCallback(
    () => {
      if(onContentSizeChange && contentSizeParams.current) {
        onContentSizeChange(...contentSizeParams.current)
      }
    },
    [ onContentSizeChange ],
  )

  const goContentSizeChange = useCallback(
    (...params) => {
      contentSizeParams.current = params
      fireOnContentSizeChange()
    },
    [ fireOnContentSizeChange ],
  )

  const getOnVerseTap = useInstanceValue(onVerseTap)

  const goVerseTap = useCallback(
    ({ selectedVerse, ...otherParams }) => {
      const onVerseTap = getOnVerseTap()

      if(!onVerseTap) return

      if(selectedVerse == null) {
        onVerseTap()
        return
      }

      let verseUsfm
      verses.current.some(({ loc, usfm }) => {
        if(loc === `${('0'+bookId).substr(-2)}${('00'+chapter).substr(-3)}${('00'+selectedVerse).substr(-3)}`) {
          verseUsfm = usfm
          return
        }
      })

      const selectedVerseUsfm = verseUsfm
      let selectedTextContent

      if(verseUsfm) {

        const { wordDividerRegex, abbr } = getVersionInfo(versionId)

        const pieces = getPiecesFromUSFM({
          usfm: verseUsfm,
          inlineMarkersOnly: true,
          wordDividerRegex,
        })

        if(pieces) {

          selectedTextContent = getCopyVerseText({
            pieces,
            ref: {
              ...passageRef,
              verse: selectedVerse,
            },
            versionAbbr: abbr,
          })

        }

      }

      onVerseTap({ selectedVerse, ...otherParams, selectedVerseUsfm, selectedTextContent })
    },
    [ versionId, passageRef ],
  )

  const data = useMemo(
    () => {
      if(!pieces) return null

      let vs = null
      let textAlreadyDisplayedInThisView = false
      let currentPrimaryBlockIdx = 0

      const getJSXFromPieces = ({ pieces, sharesBlockWithSelectedVerse, sharesBlockWithFocussedVerse, doSmallCaps, isTopLevel, noOnPress }) => {

        let { font, textSize, lineSpacing, theme, hideCantillation } = displaySettings
        hideCantillation = hideCantillation && versionId === `original` && bookId < 40

        pieces = adjustPiecesForSpecialHebrew({ isOriginal, languageId, pieces })

        const simplifiedPieces = []
        pieces.forEach(piece => {
          const { tag, text, type } = piece
          const previousPiece = simplifiedPieces.slice(-1)[0]

          if(
            previousPiece
            && !tag
            && !previousPiece.tag
            && text
            && previousPiece.text
            && (
              selectedVerse === null
              || vs !== selectedVerse
            )
          ) {
            previousPiece.text += text
            delete previousPiece.type
          } else {
            simplifiedPieces.push({ ...piece })
          }
        })

        return simplifiedPieces.map((piece, idx) => {
          let { type, tag, text, content, children, verse, apparatusJson } = piece
          tag = getNormalizedTag(tag)
          const doSmallCaps = [ 'nd', 'sc', 'fk' ].includes(tag) || doSmallCaps

          if([ "b" ].includes(tag)) {
            text = ' '
          }

          if([ "mt" ].includes(tag) && /\\(?:fe?|x) /.test(content)) {
            const footnoteRegex = /^\\(fe?|x) (.*?)\\((?:fe?|x)\*)$/
            children = content
              .split(/(\\(?:fe?|x) .*?\\(?:fe?|x)\*)/g)
              .map(text => (
                footnoteRegex.test(text)
                  ? {
                    content: text.replace(footnoteRegex, '$2'),
                    tag: text.replace(footnoteRegex, '$1'),
                    endTag: text.replace(footnoteRegex, '$3'),
                  }
                  : {
                    text,
                  }
              ))
          }

          if([ "mt" ].includes(tag) && selectedInfo) {
            verse = -1
          }

          // if(!children && !text && !content && !apparatusJson) return null  // TODO: use this line and then build out apparatus display
          if(!children && !text && !content) return null
          if([ "c", "cp" ].includes(tag)) return null

          vs = verse != null ? verse : vs

          text = adjustTextForSups({ tag, text, pieces: simplifiedPieces, idx })

          const wrapInView = tagInList({ tag, list: blockUsfmMarkers })

          if(wrapInView) {
            textAlreadyDisplayedInThisView = false
          }

          if([ "v", "vp" ].includes(tag) && content) {
            const nextPiece = simplifiedPieces[idx+1] || {}
            if(tag === "v" && nextPiece.tag === "vp") return null
            content = `${textAlreadyDisplayedInThisView ? ` ` : ``}${content}\u00A0`
          }

          if(tag === "v" && content) {
            blockIdxByVerse.current[parseInt(content, 10)] = currentPrimaryBlockIdx
          }

          let { verseTextStyles, adjustedChildren } = adjustChildrenAndGetStyles({
            bookId,
            tag,
            type,
            text,
            content,
            children,
            wrapInView,
            font,
            textSize,
            lineSpacing,
            doSmallCaps,
            languageId,
            isOriginal,
            tagThemedStyles,
          })

          if(text && hideCantillation) {
            text = removeCantillation(text)
          }

          const hasSelectedVerseChild = selectedVerse !== null && (adjustedChildren || []).some(child => child.verse === selectedVerse)
          const hadSelectedVerseChild = previousSelectedVerse !== null && (adjustedChildren || []).some(child => child.verse === previousSelectedVerse)
          const hasFocussedVerseChild = focussedVerse !== undefined && (adjustedChildren || []).some(child => child.verse === focussedVerse)
          const hadFocussedVerseChild = previousFocussedVerse !== undefined && (adjustedChildren || []).some(child => child.verse === previousFocussedVerse)

          const hasSmallCapsChild = kids => (kids || []).some(kid => [ 'nd', 'sc', 'fk' ].includes(kid.tag) || hasSmallCapsChild(kid.children))

          let keyForAndroid

          if(
            selectedVerse !== null
            && verse !== undefined
            && verse === selectedVerse
            && !!(selectedInfo || selectedTagInfo)
          ) {
            verseTextStyles = {
              ...verseTextStyles,
              ...semiSelectedVsThemedStyle,
            }
            keyForAndroid = `semiSelectedVsThemedStyle`
          }

          if(
            selectedVerse !== null
            && (type === 'word' || [ 'w', 'f', 'fe', 'x', 'zApparatusJson' ].includes(tag))
            && vs === selectedVerse
          ) {
            const selectedTranslationWordColor = (
              selectedTagInfo
              && selectedTagInfo[versionId]
              && (selectedTagInfo[versionId].find(({ wordNumberInVerse }) => wordNumberInVerse === piece.wordNumberInVerse) || {}).color
            )

            if(
              (
                !selectedTagInfo
                && equalObjs(selectedInfo, piece)
                && ![ "xt", "f", "fe", "fk", "zApparatusJson", "zFootnoteType" ].includes(tag)
              )
              || selectedTranslationWordColor
            ) {
              verseTextStyles = {
                ...verseTextStyles,
                ...selectedWordThemedStyle,
                // textShadowRadius: Platform.OS === 'ios' ? 20 : 50,
                ...(selectedTranslationWordColor ? { color: selectedTranslationWordColor } : {}),
              }
              keyForAndroid = `selectedWordThemedStyle`
            }
          }

          if(
            selectedVerse !== null
            && tag === 'v'
            && vs === selectedVerse
          ) {
            verseTextStyles = {
              ...verseTextStyles,
              ...selectedVsThemedStyle,
            }
            keyForAndroid = `selectedVsThemedStyle`
          }

          if(
            selectedVerse !== null
            && verse !== undefined
            && verse !== selectedVerse
            && sharesBlockWithSelectedVerse
          ) {
            verseTextStyles = {
              ...verseTextStyles,
              ...unselectedThemedStyle,
            }
            keyForAndroid = `unselectedThemedStyle`
          }

          if(
            selectedVerse !== null
            && [ "peh", "samech", "selah", "x", "xt", "f", "fe", "fk", "zApparatusJson", "zFootnoteType" ].includes(tag)
            && !equalObjs(selectedInfo, piece)
            && (
              vs !== selectedVerse
              || !!selectedInfo
            )
          ) {
            verseTextStyles = {
              ...verseTextStyles,
              color: getColorWithOpacity(verseTextStyles.color, .2),
            }
            keyForAndroid = `unselectedThemedStyle`
          }

          if(
            selectedVerse !== null
            && verse !== selectedVerse
            && wrapInView
            && !hasSelectedVerseChild
          ) {
            verseTextStyles = {
              ...verseTextStyles,
              ...unselectedBlockThemedStyle,
            }
          }

          if(
            focussedVerse !== undefined
            && verse !== undefined
            && verse !== focussedVerse
            && sharesBlockWithFocussedVerse
          ) {
            verseTextStyles = {
              ...verseTextStyles,
              ...unfocussedThemedStyle,
            }
            keyForAndroid = `unfocussedThemedStyle`
          }

          if(
            focussedVerse !== undefined
            && wrapInView
            && !hasFocussedVerseChild
          ) {
            verseTextStyles = {
              ...verseTextStyles,
              ...unfocussedBlockThemedStyle,
            }
          }

          const ignoreChildrenChanging = (
            vs !== selectedVerse
            && vs !== previousSelectedVerse
            && !hasSelectedVerseChild
            && !hadSelectedVerseChild
            && !hasFocussedVerseChild
            && !hadFocussedVerseChild
            && !doSmallCaps
            && !hasSmallCapsChild(adjustedChildren)
          )

          if(!adjustedChildren) {
            textAlreadyDisplayedInThisView = true
          }

          const info = (
            (
              (
                type === 'word'
                && vs === selectedVerse
              )
              || [ 'w', 'f', 'fe', 'x', 'zApparatusJson' ].includes(tag)
            )
              ? piece
              : null
          )
          let component = (
            <VerseText
              // key={Platform.OS === 'android' ? `${keyForAndroid}-${idx}` : idx}  // TODO: remove this line when RN bug fixed (https://github.com/facebook/react-native/issues/29717)
              key={`${keyForAndroid}-${idx}-${hideCantillation}`}  // NOTE: replaced the top line with this due to the footnote dots in Gen 2:6 ESV not getting updated properly on iOS
              style={verseTextStyles}
              onPress={noOnPress ? null : goVerseTap}
              verseNumber={tagInList({ tag, list: blockUsfmMarkers }) ? null : vs}
              info={info}
              // delayRenderMs={vs > 1 ? 500 : 0}
              ignoreChildrenChanging={ignoreChildrenChanging} 
            >
              {adjustedChildren
                ? getJSXFromPieces({
                  pieces: adjustedChildren,
                  sharesBlockWithSelectedVerse: hasSelectedVerseChild,
                  sharesBlockWithFocussedVerse: hasFocussedVerseChild,
                  doSmallCaps,
                  noOnPress: !!info,
                })
                : (text || content)
              }
            </VerseText>
          )

          if(wrapInView) {
            component = (
              <TouchableWithoutFeedback
                key={idx}
                onPress={onVerseTap}
              >
                <View
                  style={[
                    viewStyles.block,
                    getTagStyle({ tag, styles: viewStyles }),
                  ]}
                >
                  {component}
                </View>
              </TouchableWithoutFeedback>
            )
          }

          if(isTopLevel) currentPrimaryBlockIdx++

          return component

        })
      }

      return getJSXFromPieces({ pieces, isTopLevel: true }).filter(Boolean)
    },
    [ pieces, displaySettings, selectedVerse, selectedInfo, selectedTagInfo, focussedVerse, bookId, languageId, isOriginal, versionId ],
  )

  const initialNumBlocksToRender = useMemo(
    () => {
      if(!pieces) return 1

      const area = windowWidth * windowHeight
      const roughNumVersesToDoInInitialRender = parseInt(
        Math.max(
          2,
          Math.min(
            20,
            (35 - 20 * (displaySettings.textSize * displaySettings.lineSpacing)) * (330000 / area),
          )
        )
      )

      return (blockIdxByVerse.current[roughNumVersesToDoInInitialRender] || 2) + 1
    
    },
    [ windowWidth, windowHeight, displaySettings, pieces ],
  )

  const readyToRender = !!data && !waitOnRender.current

  useEffect(
    () => {
      if(readyToRender) {
        setIsRendered({
          ...passageRef,
          isRendered: true,
        })
      }
    },
    [ readyToRender ]
  )

  useEffect(
    () => () => {
      setIsRendered({
        ...passageRef,
        isRendered: false,
      })
    },
    []
  )

  if(!readyToRender) {
    return (
      <View style={viewStyles.viewContainer}>
        <CoverAndSpin />
      </View>
    )
  }

  const width = Math.min((950 + (displaySettings.textSize - 1) * 600) * fontScale, windowWidth)

  return (
    <FlatList
      data={data}
      extraData={data}
      renderItem={({ item: block }) => block}
      initialNumToRender={initialNumBlocksToRender}
      maxToRenderPerBatch={1}
      windowSize={hasBeenVisible.current ? 3 : 1}
      style={viewStyles.container}
      scrollEventThrottle={16}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onScroll={onScroll}
      onLayout={onLayout}
      onContentSizeChange={goContentSizeChange}
      ref={forwardRef}
      contentContainerStyle={[
        viewStyles.content,
        isParallel ? viewStyles.parallelContent : null,
        {
          width,
          paddingBottom: (
            height - (
              (
                isParallel
                  ? 0
                  : (readHeaderMarginTop + readHeaderHeight)
              )
              + 75
            )
          ),
        },
      ]}
    />
  )

}

const mapStateToProps = ({ displaySettings }) => ({
  displaySettings,
})

const matchDispatchToProps = dispatch => bindActionCreators({
  // setTheme,
}, dispatch)

 export default memo(connect(mapStateToProps, matchDispatchToProps)(ReadText), { name: 'ReadText' })

//  Check Ps 103