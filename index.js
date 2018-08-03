const root = require('window-or-global')
const getIpfs = require('window.ipfs-fallback')
const { createSelector } = require('redux-bundler')

const defaultState = {
  apiAddress: '/ip4/127.0.0.1/tcp/5001',
  gatewayUrl: 'https://ipfs.io',
  identity: null
}

function getURL (dispatch, getIpfs, action, addr) {
  dispatch({ type: `IPFS_${action}_STARTED` })

  getIpfs().config.get(`Addresses.${addr}`, (err, res) => {
    if (err) {
      console.log(err)
      dispatch({ type: `IPFS_${action}_ERRORED`, payload: err })
      return
    }

    const split = res.split('/')
    const url = '//' + split[2] + ':' + split[4]

    dispatch({ type: `IPFS_${action}_FINISHED`, payload: url })
  })
}

module.exports = {
  name: 'ipfs',

  reducer (state, {type, payload, error}) {
    state = state || defaultState
    if (type === 'IPFS_INIT_FINISHED') {
      return Object.assign({}, state, { identity: payload })
    }

    if (type === 'IPFS_INIT_FAILED') {
      return Object.assign({}, state, { error: error })
    }

    if (type === 'IPFS_API_UPDATED') {
      return Object.assign({}, state, { apiAddress: payload })
    }

    if (type === 'IPFS_GATEWAY_URL_FINISHED') {
      return Object.assign({}, state, { gatewayUrl: payload })
    }

    if (type === 'IPFS_API_URL_FINISHED') {
      return Object.assign({}, state, { apiUrl: payload })
    }

    return state
  },

  getExtraArgs () {
    return { getIpfs: () => root.ipfs }
  },

  selectIpfsReady: state => !!state.identity,

  selectIpfsIdentity: state => state.ipfs.identity,

  doInitIpfs: () => async ({ dispatch, getState }) => {
    dispatch({ type: 'IPFS_INIT_STARTED' })
    console.log('IPFS_INIT_STARTED')
    const {apiAddress} = getState().ipfs
    let identity = null
    try {
      root.ipfs = await getIpfs({ api: true, ipfs: apiAddress })
      // will fail if remote api is not available on default port
      identity = await root.ipfs.id()
    } catch (error) {
      return dispatch({ type: 'IPFS_INIT_FAILED', error })
    }
    dispatch({ type: 'IPFS_INIT_FINISHED', payload: identity })
    console.log('IPFS_INIT_FINISHED')
  },

  doUpdateIpfsAPIAddress: (apiAddress) => ({dispatch, store}) => {
    dispatch({type: 'IPFS_API_UPDATED', payload: apiAddress})
    store.doInitIpfs()
  },

  doGetIpfsUrls: () => ({ dispatch, getIpfs }) => {
    getURL(dispatch, getIpfs, 'GATEWAY_URL', 'Gateway')
    getURL(dispatch, getIpfs, 'API_URL', 'API')
  },

  // Fetch the config if we don't have it or it's more than `staleAfter` ms old
  reactGetIpfsUrls: createSelector(
    'selectIpfsReady',
    (ipfsReady) => {
      if (ipfsReady) {
        return { actionCreator: 'doGetIpfsUrls' }
      }
    }
  )
}
