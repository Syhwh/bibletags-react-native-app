import React, { useState, useMemo, useCallback, useRef } from "react"
import { StyleSheet, Text, Linking } from "react-native"
import { bindActionCreators } from "redux"
import { connect } from "react-redux"
import { Routes, Route } from "react-router-native"
import { i18n } from "inline-i18n"
import SortableList from "react-native-sortable-list"

import useRouterState from "../../hooks/useRouterState"
import useBibleVersions from "../../hooks/useBibleVersions"
import useThemedStyleSets from "../../hooks/useThemedStyleSets"
import { memo, sentry } from '../../utils/toolbox'
import { removeVersion } from '../../utils/syncBibleVersions'
import { setMyBibleVersionsOrder, removeBibleVersion, removeParallelVersion } from "../../redux/actions"

import SafeLayout from "../basic/SafeLayout"
import VersionInfo from "./VersionInfo"
import AddVersion from "./AddVersion"
import BasicHeader from "../major/BasicHeader"
import VersionItem from "../basic/VersionItem"
import HeaderIconButton from "../basic/HeaderIconButton"

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 10,
  },
  label: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    fontSize: 11,
    textAlign: 'left',  // needed so that it is flipped to right when rtl
  },
})

const Versions = ({
  style,
  labelStyle,

  eva: { style: themedStyle={} },

  myBibleVersions,

  setMyBibleVersionsOrder,
  removeBibleVersion,
  removeParallelVersion,
}) => {

  const { baseThemedStyle, labelThemedStyle } = useThemedStyleSets(themedStyle)

  const [ reordering, setReordering ] = useState(false)

  const currentOrder = useRef()

  const { historyPush } = useRouterState()

  const { versionIds, requiredVersionIds, getVersionStatus, getParallelIsAvailable } = useBibleVersions({ myBibleVersions })

  const renderItem = ({ data: versionId, active }) => {
    const { download, downloaded } = getVersionStatus(versionId)

    return (
      <VersionItem
        key={versionId}
        versionId={versionId}
        active={active}
        reorderable={true}
        reordering={reordering}
        downloading={download && !downloaded}
        downloaded={downloaded}
        options={[
          {
            title: i18n("Version information"),
            onPress: () => {
              historyPush(
                "/Read/Versions/VersionInfo",
                {
                  versionId,
                },
              )
            },
          },
          {
            title: i18n("Tagging stats"),
            onPress: () => {
              Linking.openURL(`https://downloads.bibletags.org/versions/${versionId}.html`).catch(err => {
                sentry({ error })
                historyPush("/ErrorMessage", {
                  message: i18n("Your device is not allowing us to open this link."),
                })
              })
            },
          },
          ...(requiredVersionIds.includes(versionId) ? [] : [{
            title: i18n("Remove"),
            onPress: async () => {
              if(!getParallelIsAvailable({ versionIdToRemove: versionId })) {
                removeParallelVersion()
              }
              await removeVersion({
                id: versionId,
                removeBibleVersion,
              })
            },
          }]),
        ]}
      />
    )
  }

  const extraButtons = useMemo(
    () => [
      <HeaderIconButton
        key="reorder"
        name={"md-reorder"}
        onPress={() => {
          setReordering(!reordering)
          if(currentOrder.current) {
            setMyBibleVersionsOrder({ ids: currentOrder.current.map(idx => versionIds[idx]) })
            currentOrder.current = undefined
          }
        }}
        uiStatus={reordering ? `selected` : `unselected`}
      />,
      <HeaderIconButton
        key="add"
        name={"md-add"}
        onPress={() => historyPush("/Read/Versions/AddVersion")}
        uiStatus={reordering ? `disabled` : `unselected`}
      />,
    ],
    [ reordering ],
  )

  const onReleaseRow = useCallback(
    (x, newOrder) => {
      currentOrder.current = newOrder
    },
    [ versionIds ],
  )

  return (
    <Routes>
      <Route path="/VersionInfo" element={<VersionInfo />} />
      <Route path="/AddVersion/*" element={<AddVersion />} />
      <Route
        path="*"
        element={
          <SafeLayout>
            <BasicHeader
              title={i18n("My Bible Versions")}
              extraButtons={extraButtons}
              disableBack={reordering}
            />
            {reordering &&
              <Text
                style={[
                  styles.label,
                  labelThemedStyle,
                  labelStyle,
                ]}
              >
                {i18n("Press and drag to reorder")}
              </Text>
            }
            <SortableList
              key={JSON.stringify(versionIds)}
              style={[
                styles.list,
                baseThemedStyle,
                style,
              ]}
              contentContainerStyle={styles.contentContainer}
              data={versionIds}
              renderRow={renderItem}
              scrollEnabled={!reordering}
              sortingEnabled={reordering}
              onReleaseRow={onReleaseRow}
            />
          </SafeLayout>
        }
      />
    </Routes>
  )

}

const mapStateToProps = ({ myBibleVersions }) => ({
  myBibleVersions,
})

const matchDispatchToProps = dispatch => bindActionCreators({
  setMyBibleVersionsOrder,
  removeBibleVersion,
  removeParallelVersion,
}, dispatch)

export default memo(connect(mapStateToProps, matchDispatchToProps)(Versions), { name: 'Versions' })