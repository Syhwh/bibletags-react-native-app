import React from "react"
import { Constants } from "expo"
import { ScrollView, View, StyleSheet, Dimensions } from "react-native"
import { bindActionCreators } from "redux"
import { connect } from "react-redux"

import ReadText from './ReadText'

import { setVersionId, setParallelVersionId, setPassageScroll } from "../../redux/actions"

const {
  DIVIDER_COLOR,
  PRIMARY_VERSIONS,
  SECONDARY_VERSIONS,
} = Constants.manifest.extra

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    width: '300%',
  },
  page: {
    width: '100%',
    maxWidth: '100%',
    height: '100%',
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER_COLOR,
  },
})

class ReadContent extends React.PureComponent {

  state = {
    primaryLoaded: false,
    secondaryLoaded: false,
    passage: null,
  }

  static getDerivedStateFromProps(props, state) {
    const { passage } = props

    if(passage === state.passage) return null

    return {
      primaryLoaded: false,
      secondaryLoaded: false,
      passage,
    }
  }

  componentDidMount() {
    const { passage, setVersionId, setParallelVersionId } = this.props
    const { versionId, parallelVersionId } = passage

    // in the event that a version has been removed...

    if(!PRIMARY_VERSIONS.includes(versionId)) {
      setVersionId({ versionId: PRIMARY_VERSIONS[0] })
    }

    if(parallelVersionId && !SECONDARY_VERSIONS.includes(parallelVersionId)) {
      setParallelVersionId({ parallelVersionId: SECONDARY_VERSIONS[0] })
    }
  }

  setUpParallelScroll = () => {

    this.onPrimaryTouchStart()
    this.onPrimaryScroll({
      nativeEvent: {
        contentOffset: {
          y: this.primaryScrollY,
        }
      }
    })
  }

  hasParallel = () => !!this.props.passage.parallelVersionId

  getScrollFactor = () => {
    const primaryMaxScroll = Math.max(this.primaryContentHeight - this.primaryHeight, 0)
    const secondaryMaxScroll = Math.max(this.secondaryContentHeight - this.secondaryHeight, 0)

    return primaryMaxScroll / secondaryMaxScroll
  }

  onPrimaryTouchStart = () => this.scrollController = 'primary'
  onSecondaryTouchStart = () => this.scrollController = 'secondary'

  primaryScrollY = 0

  onPrimaryScroll = ({ nativeEvent }) => {
    const { setPassageScroll } = this.props
    this.primaryScrollY = nativeEvent.contentOffset.y

    setPassageScroll({
      y: this.primaryScrollY,
    })

    if(!this.secondaryRef) return
    if(this.scrollController !== 'primary') return
    if(!this.hasParallel()) return

    const y = this.primaryScrollY / this.getScrollFactor()
    this.secondaryRef.scrollTo({ y, animated: false })
  }

  onSecondaryScroll = ({ nativeEvent }) => {
    if(!this.primaryRef) return
    if(this.scrollController !== 'secondary') return
    if(!this.hasParallel()) return

    const y = nativeEvent.contentOffset.y * this.getScrollFactor()
    this.primaryRef.scrollTo({ y, animated: false })
  }

  onPrimaryLayout = ({ nativeEvent }) => this.primaryHeight = nativeEvent.layout.height
  onSecondaryLayout = ({ nativeEvent }) => this.secondaryHeight = nativeEvent.layout.height

  onPrimaryContentSizeChange = (contentWidth, contentHeight) => this.primaryContentHeight = contentHeight
  onSecondaryContentSizeChange = (contentWidth, contentHeight) => {
    this.secondaryContentHeight = contentHeight
    this.setUpParallelScroll()
  }

  onPrimaryLoaded = () => {
    const { passageScrollY } = this.props

    this.primaryRef.scrollTo({ y: passageScrollY, animated: false })
    this.primaryScrollY = passageScrollY

    this.setUpParallelScroll()

    this.setState({ primaryLoaded: true })
  }

  onSecondaryLoaded = () => this.setState({ secondaryLoaded: true })

  setPrimaryRef = ref => this.primaryRef = ref
  setSecondaryRef = ref => this.secondaryRef = ref

  setRef = ref => {
    this.ref = ref
    setTimeout(this.setContentOffset)
  }

  setContentOffset = () => {
    const { width } = Dimensions.get('window')
    this.ref.scrollTo({ x: width, animated: false })
  }

  render() {
    const { passage, recentPassages, recentSearches } = this.props
    const { ref, versionId, parallelVersionId } = passage
    const { primaryLoaded, secondaryLoaded } = this.state

    const showingRecentBookmarks = (recentPassages.length + recentSearches.length) !== 1

    const adjacentRefs = {
      previous: {
        ...ref,
        chapter: ref.chapter - 1,
      },
      next: {
        ...ref,
        chapter: ref.chapter + 1,
      },
    }

    const { width } = Dimensions.get('window')

    const getAdjacentPage = direction => {
      return (
        <View style={styles.page}>
          {primaryLoaded && (secondaryLoaded || !parallelVersionId) &&
            <React.Fragment>
              <ReadText
                key={`${versionId} ${ref.bookId} ${ref.chapter} ${direction}`}
                passageRef={adjacentRefs[direction]}
                versionId={versionId}
              />
              {!!parallelVersionId &&
                <React.Fragment>
                  <View style={styles.divider} />
                  <ReadText
                    key={`${parallelVersionId} ${ref.bookId} ${ref.chapter} ${direction}`}
                    passageRef={adjacentRefs[direction]}
                    versionId={parallelVersionId}
                  />
                </React.Fragment>
              }
            </React.Fragment>
          }
        </View>
      )
    }

    return (
      <ScrollView
        style={[
          styles.container,
          (showingRecentBookmarks ? { marginBottom: 84 } : null),
        ]}
        contentContainerStyle={styles.contentContainer}
        horizontal={true}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: width, y: 0 }}
        ref={this.setRef}
        //onContentSizeChange={this.setContentOffset}  I might need this for device rotation
      >
        {getAdjacentPage('previous')}
        <View style={styles.page}>
          <ReadText
            key={`${versionId} ${ref.bookId} ${ref.chapter}`}
            passageRef={ref}
            versionId={versionId}
            onTouchStart={this.onPrimaryTouchStart}
            onScroll={this.onPrimaryScroll}
            onLayout={this.onPrimaryLayout}
            onContentSizeChange={this.onPrimaryContentSizeChange}
            onLoaded={this.onPrimaryLoaded}
            setRef={this.setPrimaryRef}
          />
          {!!parallelVersionId &&
            <React.Fragment>
              <View style={styles.divider} />
              <ReadText
                key={`${parallelVersionId} ${ref.bookId} ${ref.chapter}`}
                passageRef={ref}
                versionId={parallelVersionId}
                onTouchStart={this.onSecondaryTouchStart}
                onScroll={this.onSecondaryScroll}
                onLayout={this.onSecondaryLayout}
                onContentSizeChange={this.onSecondaryContentSizeChange}
                onLoaded={this.onSecondaryLoaded}
                setRef={this.setSecondaryRef}
              />
            </React.Fragment>
          }
        </View>
        {getAdjacentPage('next')}
      </ScrollView>
    )
  }
}

const mapStateToProps = ({ passage, passageScrollY, recentPassages, recentSearches }) => ({
  passage,
  passageScrollY,
  recentPassages,
  recentSearches,
})

const matchDispatchToProps = dispatch => bindActionCreators({
  setVersionId,
  setParallelVersionId,
  setPassageScroll,
}, dispatch)

export default connect(mapStateToProps, matchDispatchToProps)(ReadContent)