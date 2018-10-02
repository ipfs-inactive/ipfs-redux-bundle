/* global it, expect, jest */
const tryApi = require('./index.js')
const { URL } = require('url')

it('Should use the apiAddress', async (done) => {
  const opts = {
    apiAddress: '/ip4/1.1.1.1/tcp/1111',
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: new URL('http://localhost:5001'),
    IpfsApi: jest.fn(),
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  expect(res.apiAddress).toEqual(opts.apiAddress)
  expect(res.provider).toEqual('js-ipfs-api')
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  expect(opts.IpfsApi.mock.calls.length).toBe(1)
  done()
})

it('Should use the location where hostname not localhost', async (done) => {
  const opts = {
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: new URL('http://dev.local:5001'),
    IpfsApi: jest.fn(),
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  expect(res.apiAddress).toEqual('/dnsaddr/dev.local/tcp/5001/http')
  expect(res.provider).toEqual('js-ipfs-api')
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  expect(opts.IpfsApi.mock.calls.length).toBe(1)
  done()
})

it('Should use the location where port not 5001', async (done) => {
  const opts = {
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: new URL('http://localhost:9999'),
    IpfsApi: jest.fn(),
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  expect(res.apiAddress).toEqual('/dnsaddr/localhost/tcp/9999/http')
  expect(res.provider).toEqual('js-ipfs-api')
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  expect(opts.IpfsApi.mock.calls.length).toBe(1)
  done()
})

it('Should use the defaultApiAddress if location fails', async (done) => {
  const opts = {
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: new URL('http://astro.cat:5001'),
    IpfsApi: jest.fn(),
    // location call fails, default ok
    ipfsConnectionTest: jest.fn()
      .mockRejectedValueOnce(new Error('nope'))
      .mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  console.log('res', res)
  expect(res.apiAddress).toEqual(opts.defaultApiAddress)
  expect(res.provider).toEqual('js-ipfs-api')
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(2)
  expect(opts.IpfsApi.mock.calls.length).toBe(2)
  done()
})
