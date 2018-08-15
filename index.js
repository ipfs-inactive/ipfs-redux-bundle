const getIpfs = require('window.ipfs-fallback')

const defaultState = {
  apiAddress: '/ip4/127.0.0.1/tcp/5001',
  identity: null,
  error: null
}

module.exports = function () {
  let ready = false
  let ipfs = null

  return {
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
        ready = true
        return Object.assign({}, state, { identity: payload })
      }

      if (type === 'IPFS_INIT_FAILED') {
        ready = false
        return Object.assign({}, state, { error: error })
      }

      if (type === 'IPFS_API_UPDATED') {
        return Object.assign({}, state, { apiAddress: payload, error: null })
      }

      return state
    },

    getExtraArgs () {
      return { getIpfs: () => ipfs }
    },

    selectIpfsReady: () => ready,

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
      } catch (error) {
        return dispatch({ type: 'IPFS_INIT_FAILED', error })
      }

      dispatch({ type: 'IPFS_INIT_FINISHED', payload: identity })
    },

    doUpdateIpfsAPIAddress: (apiAddress) => ({dispatch, store}) => {
      ready = false
      dispatch({type: 'IPFS_API_UPDATED', payload: apiAddress})
      store.doInitIpfs()
    }
  }
}
