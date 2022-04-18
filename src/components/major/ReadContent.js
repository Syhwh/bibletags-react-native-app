import React, { useCallback, useEffect, useRef, useMemo, useState } from "react"
import { FlatList, StyleSheet, I18nManager, View } from "react-native"
import { bindActionCreators } from "redux"
import { connect } from "react-redux"
import { useDimensions } from "@react-native-community/hooks"
import { useLayout } from '@react-native-community/hooks'
import { getNumberOfChapters } from "@bibletags/bibletags-versification"

import useBibleVersions from "../../hooks/useBibleVersions"
import useInstanceValue from "../../hooks/useInstanceValue"
import { equalObjs, getVersionInfo } from "../../utils/toolbox"

import ReadContentPage from "./ReadContentPage"

import { setRef, setVersionId, setParallelVersionId } from "../../redux/actions"

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

const ReadContent = React.memo(({
  selectedData,
  setSelectedData,

  passage,
  myBibleVersions,

  setRef,
  setVersionId,
  setParallelVersionId,
}) => {

  const { ref, versionId, parallelVersionId } = passage
  const getRef = useInstanceValue(ref)
  const lastSetRef = useRef(ref)

  const getSelectedData = useInstanceValue(selectedData)

  const containerRef = useRef()

  const { width } = useDimensions().window
  const { onLayout, height } = useLayout()

  const [ initialScrollExecuted, setInitialScrollExecuted ] = useState(false)
  const getInitialScrollExecuted = useInstanceValue(initialScrollExecuted)

  const { primaryVersionIds, secondaryVersionIds } = useBibleVersions({ myBibleVersions })

  const booksAndChapters = useMemo(
    () => (
      Array(66).fill()
        .map((x, idx) => (
          Array(
            getNumberOfChapters({
              versionInfo: getVersionInfo(versionId),
              bookId: idx + 1,
            })
          ).fill().map((x, idx2) => ({
            bookId: idx + 1,
            chapter: idx2 + 1,
          }))
        ))
        .flat()
    ),
    [ versionId ],
  )
  const getBooksAndChapters = useInstanceValue(booksAndChapters)

  const setContentOffset = useCallback(
    () => {
      const booksAndChapters = getBooksAndChapters()
      const ref = getRef()
      const scrollToIndex = booksAndChapters.findIndex(({ bookId, chapter }) => (bookId === ref.bookId && chapter === ref.chapter))
      containerRef.current.scrollToIndex({
        index: scrollToIndex,
        animated: false,
      })
    },
    [],
  )

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }) => {
      if(viewableItems.length === 1 && getInitialScrollExecuted()) {

        const booksAndChapters = getBooksAndChapters()
        const ref = getRef()

        const { index } = viewableItems[0]
        const currentIndex = booksAndChapters.findIndex(({ bookId, chapter }) => (bookId === ref.bookId && chapter === ref.chapter))

        if(index !== currentIndex && booksAndChapters[index]) {
          lastSetRef.current = booksAndChapters[index]
          setRef({
            ref: booksAndChapters[index],
            wasSwipe: true,
          })
        }

      }
    },
    [],
  )

  const keyExtractor = useCallback(item => JSON.stringify(item), [])

  const getItemLayout = useCallback(
    (data, index) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [ width ],
  )

  const onLayoutAndSetInitialScrollIndex = useCallback(
    (...params) => {
      setContentOffset()
      setInitialScrollExecuted(true)
      onLayout(...params)
    },
    [ setContentOffset, onLayout ],
  )

  const onVerseTap = useCallback(
    ({ selectedSection, selectedVerse, selectedTextContent, selectedInfo, pageX, pageY }={}) => {

      const currentSelectedData = getSelectedData()

      if(
        currentSelectedData.selectedSection
        && !(
          currentSelectedData.selectedSection === selectedSection
          && currentSelectedData.selectedVerse === selectedVerse
        )
      ) {
        setSelectedData({})
        return
      }

      if(selectedVerse == null) return

      setSelectedData({
        selectedSection,
        selectedVerse,
        selectedTextContent,
        selectedTapX: pageX,
        selectedTapY: pageY,
        selectedInfo,
      })
    },
    [ setSelectedData ],
  )

  const renderItem = useCallback(
    ({ item: ref }) => {

      const thisPagePassage = { versionId, parallelVersionId, ref }
      const isCurrentPassagePage = (
        ref.bookId === passage.ref.bookId
        && ref.chapter === passage.ref.chapter
      )

      if(!initialScrollExecuted) {
        return <View style={{ width, height }} />
      }

      return (
        <ReadContentPage
          key={JSON.stringify(thisPagePassage)}
          passage={thisPagePassage}
          isCurrentPassagePage={isCurrentPassagePage}
          {...(isCurrentPassagePage ? selectedData : {})}
          onVerseTap={onVerseTap}
          height={height}
          width={width}
        />
      )
    },
    [ versionId, parallelVersionId, passage, selectedData, height, onVerseTap, width, initialScrollExecuted ],
  )

  useEffect(
    () => {
      if(primaryVersionIds.length === 0) return

      // in the event that a version has been removed...

      if(!primaryVersionIds.includes(versionId)) {
        setVersionId({ versionId: primaryVersionIds[0] })
      }

      if(parallelVersionId && !secondaryVersionIds.includes(parallelVersionId)) {
        setParallelVersionId({ parallelVersionId: secondaryVersionIds[0] })
      }
    },
    [ primaryVersionIds.length === 0 ],
  )

  useEffect(
    () => {
      // update content offset if passage changed (except if it was a swipe)
      if(!equalObjs(ref, lastSetRef.current)) {
        lastSetRef.current = ref
        setContentOffset()
      }
    },
    [ ref ],
  )

  if(primaryVersionIds.length === 0) return null

  return (
    <>
      <FlatList
        data={booksAndChapters}
        extraData={renderItem}
        getItemLayout={getItemLayout}
        renderItem={renderItem}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        keyExtractor={keyExtractor}
        windowSize={3}
        style={styles.container}
        horizontal={true}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        onLayout={initialScrollExecuted ? onLayout : onLayoutAndSetInitialScrollIndex}
        ref={containerRef}
      />
    </>
  )

})

const mapStateToProps = ({ passage, myBibleVersions }) => ({
  passage,
  myBibleVersions,
})

const matchDispatchToProps = dispatch => bindActionCreators({
  setRef,
  setVersionId,
  setParallelVersionId,
}, dispatch)

export default connect(mapStateToProps, matchDispatchToProps)(ReadContent)