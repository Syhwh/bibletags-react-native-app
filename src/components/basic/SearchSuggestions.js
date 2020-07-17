import React from "react"
import { StyleSheet } from "react-native"
import { List, styled } from "@ui-kitten/components"
import { bindActionCreators } from "redux"
import { connect } from "react-redux"

import useRouterState from "../../hooks/useRouterState"
import useBibleVersions from "../../hooks/useBibleVersions"

import SearchSuggestion from "./SearchSuggestion"

const MAX_SEARCH_RESULTS = 15

const styles = StyleSheet.create({
  list: {
    paddingVertical: 10,
    height: '100%',
  },
})

const getSearchKey = ({ searchString, versionId }) => `${versionId}:${searchString}`

const SearchSuggestions = React.memo(({
  editedSearchString,
  setEditing,
  updateEditedSearchString,
  style,

  themedStyle,

  history,
  myBibleVersions,
}) => {

  const { routerState } = useRouterState()
  const { searchString="" } = routerState

  const { versionIds } = useBibleVersions({ myBibleVersions })

  const searchKeys = []
  let searchHistory = history.filter(search => {
    if(search.type !== 'search') return false
    
    const searchKey = getSearchKey(search)

    if(searchKeys.includes(searchKey)) {
      return false
    } else {
      searchKeys.push(searchKey)
      return true
    }
  })

  const normalizedEditedSearchString = editedSearchString.toLowerCase().trim()
  if(normalizedEditedSearchString && searchString !== normalizedEditedSearchString) {
    const editedSearchStringWords = normalizedEditedSearchString.split(" ")  // Needs to be modified to be version-specific, as not all languages divide words with spaces
    searchHistory = searchHistory.filter(({ searchString }) => {
      const searchStringWords = searchString.split(" ")  // Needs to be modified to be version-specific, as not all languages divide words with spaces
      return editedSearchStringWords.every(word => searchStringWords.some(w => w.indexOf(word) === 0))
    })
  }

  searchHistory = searchHistory.slice(0, MAX_SEARCH_RESULTS)

  const renderItem = ({ item: search }) => (
    <SearchSuggestion
      key={getSearchKey(search)}
      setEditing={setEditing}
      updateEditedSearchString={updateEditedSearchString}
      {...search}
      uiStatus={!versionIds.includes(search.versionId) ? `disabled` : `unselected`}
    />
  )

  return (
    <List
      data={searchHistory}
      renderItem={renderItem}
      style={[
        styles.list,
        themedStyle,
        style,
      ]}
      keyboardShouldPersistTaps={'handled'}
    />
  )

})

const mapStateToProps = ({ history, myBibleVersions }) => ({
  history,
  myBibleVersions,
})

const matchDispatchToProps = (dispatch, x) => bindActionCreators({
  // recordSearch,
}, dispatch)


SearchSuggestions.styledComponentName = 'SearchSuggestions'

export default styled(connect(mapStateToProps, matchDispatchToProps)(SearchSuggestions))