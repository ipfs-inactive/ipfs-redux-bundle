const root = require('window-or-global')
const getIpfs = require('window.ipfs-fallback')

const defaultState = {
  apiAddress: '/ip4/127.0.0.1/tcp/5001',
  identity: null,
  error: null
}

module.exports = {
  name: 'ipfs',

  persistActions: [
    'IPFS_INIT_FINISHED',
    'IPFS_API_UPDATED'
  ],

  reducer (state, {type, payload, error}) {
    state = state || defaultState

    if (type === 'IPFS_INIT_STARTED') {
      return Object.assign({}, state, { error: null })
    }

    if (type === 'IPFS_INIT_FINISHED') {
      return Object.assign({}, state, { ipfsReady: true, identity: payload })
    }

    if (type === 'IPFS_INIT_FAILED') {
      return Object.assign({}, state, { ipdaReady: false, error: error })
    }

    if (type === 'IPFS_API_UPDATED') {
      return Object.assign({}, state, { apiAddress: payload, error: null })
    }

    return state
  },

  getExtraArgs () {
    return { getIpfs: () => root.ipfs }
  },

  selectIpfsReady: state => state.ipfs.ipfsReady,

  selectIpfsApiAddress: state => state.ipfs.apiAddress,

  selectIpfsInitFailed: state => !!state.ipfs.error,

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
    // root.ipfs needs to be set to null so getIpfs doesn't
    // use the previous connection.
    root.ipfs = null
    store.doInitIpfs()
  }
}
