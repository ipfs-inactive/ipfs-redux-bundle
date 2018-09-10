'use strict'
/* eslint-env browser, webextensions */

const windowIpfsFallback = require('window.ipfs-fallback')
const root = require('window-or-global')

const localStorage = root.localStorage
const getAddress = () => localStorage ? localStorage.getItem('ipfs-api-address') : null
const persistAddress = (val) => localStorage ? localStorage.setItem('ipfs-api-address', val) : null

const defaultState = {
  apiOpts: {
    host: '127.0.0.1',
    port: '5001',
    protocol: 'http'
  },
  identity: null,
  provider: null, // 'window.ipfs' | 'js-ipfs-api' | 'js-ipfs'
  error: null,
  ready: false
}

module.exports = (fallbackToJsIpfs = true) => {
  let ipfs = null

  return {
    name: 'ipfs',

    reducer (state, {type, payload, error}) {
      state = state || defaultState

      if (type === 'IPFS_INIT_STARTED') {
        return Object.assign({}, state, { error: null })
      }

      if (type === 'IPFS_INIT_FINISHED') {
        return Object.assign({}, state, { ready: true, ...payload })
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

    selectIpfsProvider: state => state.ipfs.provider,

    selectIpfsApiAddress: state => state.ipfs.apiAddress,

    selectIpfsInitFailed: state => !!state.ipfs.error,

    selectIpfsIdentity: state => state.ipfs.identity,

    doInitIpfs: () => async ({ dispatch, getState }) => {
      dispatch({ type: 'IPFS_INIT_STARTED' })

      let apiOpts
      let res

      apiOpts = getParam('ipfsApi')

      if (apiOpts) {
        res = await tryJsIpfsApi(apiOpts)

        if (res) {
          ifps = res.ipfs

          return dispatch({
            type: 'IPFS_INIT_FINISHED',
            payload: {
              identity: res.identity,
              provider: 'js-ipfs-api',
              apiOpts
            }
          })
        }
      }

      res = await tryWindow()
      if (res) {
        ifps = res.ipfs

        return dispatch({
          type: 'IPFS_INIT_FINISHED',
          payload: {
            identity: res.identity,
            provider: 'window.ipfs'
          }
        })
      }

      apiOpts = Object.assign({}, getState().ipfs.apiOpts, getUserOpts('ipfsApi'))
      res = await tryJsIpfsApi(apiOpts)

      if (res) {
        ifps = res.ipfs

        return dispatch({
          type: 'IPFS_INIT_FINISHED',
          payload: {
            identity: res.identity,
            provider: 'js-ipfs-api',
            apiOpts
          }
        })
      }

      if (fallbackToJsIpfs) {
        const opts = getUserOpts('ipfsOpts')
        res = await tryJsIpfs(opts)

        if (res) {
          ifps = res.ipfs
  
          return dispatch({
            type: 'IPFS_INIT_FINISHED',
            payload: {
              identity: res.identity,
              provider: 'js-ipfs'
            }
          })
        }  
      }

      dispatch({ type: 'IPFS_INIT_FAILED', error })
    },

    doUpdateIpfsAPIAddress: (apiAddress) => ({dispatch, store}) => {
      dispatch({type: 'IPFS_API_UPDATED', payload: apiAddress})
      store.doInitIpfs()
    }
  }
}

async function tryJsIpfsApi (opts) {
  try {
    console.time('IPFS_INIT_API')
    console.log('Trying ipfs-api', opts)

    console.info('🎛️ Customise your js-ipfs-api options by setting:')
    console.info('\t1. an address in the URL with `ipfsApi` param. e.g. ?ipfsApi=/ip4/127.0.0.1/tcp/5001')
    console.info('\t2. a `ipfsApi` value in localStorage. e.g. localStorage.setItem(\'ipfsApi\', JSON.stringify({port: \'1337\'}))')

    ipfs = new IpfsApi(opts)
    identity = await ipfs.id()
    console.log('js-ipfs-api ready!')

    console.timeEnd('IPFS_INIT_API')
    return { ipfs, identity }
  } catch (e) {
    console.log('No ipfs-api found', error)
  }
}

async function tryWindow () {
  console.log('Trying window.ipfs')

  // Opportunistic optimizations when running from ipfs-companion (+ ipfs-desktop in future)
  if (typeof browser === 'object') {
    // Note: under some vendors getBackgroundPage() will return null if window is in incognito mode
    const webExt = await browser.runtime.getBackgroundPage()
    // If extension is ipfs-companion exposing IPFS API, use it directly for best performance
    if (webExt && webExt.ipfsCompanion && webExt.ipfsCompanion.ipfs) {
      const ipfs = webExt.ipfsCompanion.ipfs
      const identity = await ipfs.id()

      return { identity, ipfs }
    }
  }

  if (root.ipfs) {
    try {
      identity = await root.ipfs.id()
      console.log('Found `window.ipfs`. Nice!')

      return { ipfs: root.ipfs, identity }
    } catch (error) {
      console.log('Failed to get id from window.ipfs', error)
    }
  } else {
    console.log('No window.ipfs found. Consider Installing the IPFS Companion web extension - https://github.com/ipfs-shipyard/ipfs-companion')
  }
}

async function tryJsIpfs (opts) {
  try {
    console.time('IPFS_INIT_JS_IPFS')
    console.log('Trying js-ipfs', opts)
    console.info('🎛️ Customise your js-ipfs opts by setting an `ipfsOpts` value in localStorage. e.g. localStorage.setItem(\'ipfsOpts\', JSON.stringify({relay: {enabled: true}}))')
    const Ipfs = await import('ipfs')
    const ipfs = await initJsIpfs(Ipfs, opts)
    identity = await ipfs.id()
    console.log('js-ipfs ready!')
    root._ipfs = ipfs
    console.timeEnd('IPFS_INIT_JS_IPFS')
    return dispatch({
      type: 'IPFS_INIT_FINISHED',
      payload: {
        identity,
        provider: 'js-ipfs'
      }
    })
  } catch (error) {
    console.log('Failed to initialise js-ipfs', error)
  }
}

function getUserOpts (key) {
  let userOpts = {}
  if (root.localStorage) {
    try {
      const optsStr = root.localStorage.getItem(key) || '{}'
      userOpts = JSON.parse(optsStr)
    } catch (error) {
      console.log(`Error reading '${key}' value from localStorage`, error)
    }
  }
  return userOpts
}

function initJsIpfs (Ipfs, opts) {
  return new Promise((resolve, reject) => {
    const ipfs = new Ipfs(opts)
    ipfs.once('ready', () => resolve(ipfs))
    ipfs.once('error', err => reject(err))
  })
}

function getParam (key) {
  const params = new URLSearchParams(window.location.search)
  return params.get(key)
}
