/* global it, expect, jest */
import tryApi from './index.js'

it('Should use the apiAddress', async (done) => {
  const opts = {
    apiAddress: '/ip4/1.1.1.1/tcp/1111',
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: {
      protocol: 'http',
      hostname: 'localhost',
      port: '5001'
    },
    IpfsApi: jest.fn(),
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  expect(res.apiOpts).toEqual(opts.apiAddress)
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  expect(opts.IpfsApi.mock.calls.length).toBe(1)
  done()
})

it('Should use the location where hostname not local', async (done) => {
  const opts = {
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: {
      protocol: 'http',
      hostname: 'custom.world',
      port: '5001'
    },
    IpfsApi: jest.fn(),
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  expect(res.apiOpts.host).toEqual(opts.location.hostname)
  expect(res.apiOpts.port).toEqual(opts.location.port)
  expect(res.apiOpts.protocol).toEqual(opts.location.protocol)
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  expect(opts.IpfsApi.mock.calls.length).toBe(1)
  done()
})

it('Should use the location where port not 5001', async (done) => {
  const opts = {
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: {
      protocol: 'http',
      hostname: '127.0.0.1',
      port: '9999'
    },
    IpfsApi: jest.fn(),
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  expect(res.apiOpts.host).toEqual(opts.location.hostname)
  expect(res.apiOpts.port).toEqual(opts.location.port)
  expect(res.apiOpts.protocol).toEqual(opts.location.protocol)
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  expect(opts.IpfsApi.mock.calls.length).toBe(1)
  done()
})

it('Should use the location where hostname not local and provide port 80 for http', async (done) => {
  const opts = {
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: {
      protocol: 'http',
      hostname: '127.0.0.1',
      port: ''
    },
    IpfsApi: jest.fn(),
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  expect(res.apiOpts.host).toEqual(opts.location.hostname)
  expect(res.apiOpts.port).toEqual('80')
  expect(res.apiOpts.protocol).toEqual(opts.location.protocol)
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  expect(opts.IpfsApi.mock.calls.length).toBe(1)
  done()
})

it('Should use the location where hostname not local and provide port 443 for https', async (done) => {
  const opts = {
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: {
      protocol: 'https',
      hostname: '127.0.0.1',
      port: ''
    },
    IpfsApi: jest.fn(),
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  expect(res.apiOpts.host).toEqual(opts.location.hostname)
  expect(res.apiOpts.port).toEqual('443')
  expect(res.apiOpts.protocol).toEqual(opts.location.protocol)
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  expect(opts.IpfsApi.mock.calls.length).toBe(1)
  done()
})

it('Should use the defaultApiAddress if location fails', async (done) => {
  const opts = {
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: {
      protocol: 'http',
      hostname: 'astro.cat',
      port: '5001'
    },
    IpfsApi: jest.fn(),
    // location call fails, default ok
    ipfsConnectionTest: jest.fn()
      .mockRejectedValueOnce(new Error('nope'))
      .mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  console.log('res', res)
  expect(res.apiOpts).toEqual(opts.defaultApiAddress)
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(2)
  expect(opts.IpfsApi.mock.calls.length).toBe(2)
  done()
})
