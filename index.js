const getIpfs = require('window.ipfs-fallback')
const root = require('window-or-global')

const localStorage = root.localStorage
const getAddress = () => localStorage ? localStorage.getItem('ipfs-api-address') : null
const persistAddress = (val) => localStorage ? localStorage.setItem('ipfs-api-address', val) : null

const defaultState = {
  apiAddress: getAddress() || '/ip4/127.0.0.1/tcp/5001',
  identity: null,
  error: null,
  ready: false
}

module.exports = () => {
  let ipfs = null

  return {
    name: 'ipfs',

    reducer (state, {type, payload, error}) {
      state = state || defaultState

      if (type === 'IPFS_INIT_STARTED') {
        return Object.assign({}, state, { error: null })
      }

      if (type === 'IPFS_INIT_FINISHED') {
        return Object.assign({}, state, { ready: true, identity: payload })
      }

      if (type === 'IPFS_INIT_FAILED') {
        return Object.assign({}, state, { ready: false, error: error })
      }

      if (type === 'IPFS_API_UPDATED') {
        return Object.assign({}, state, { ready: false, apiAddress: payload, error: null })
      }

      return state
    },

    getExtraArgs () {
      return { getIpfs: () => ipfs }
    },

    selectIpfsReady: state => state.ipfs.ready,

    selectIpfsApiAddress: state => state.ipfs.apiAddress,

    selectIpfsInitFailed: state => !!state.ipfs.error,

    selectIpfsIdentity: state => state.ipfs.identity,

    doInitIpfs: () => async ({ dispatch, getState }) => {
      dispatch({ type: 'IPFS_INIT_STARTED' })

      const { apiAddress } = getState().ipfs
      let identity = null

      try {
        ipfs = await getIpfs({ api: true, ipfs: apiAddress })
        // will fail if remote api is not available on default port
        identity = await ipfs.id()
        // if it works, save the address for the next time
        persistAddress(apiAddress)
      } catch (error) {
        return dispatch({ type: 'IPFS_INIT_FAILED', error })
      }

      dispatch({ type: 'IPFS_INIT_FINISHED', payload: identity })
    },

    doUpdateIpfsAPIAddress: (apiAddress) => ({dispatch, store}) => {
      dispatch({type: 'IPFS_API_UPDATED', payload: apiAddress})
      store.doInitIpfs()
    }
  }
}
