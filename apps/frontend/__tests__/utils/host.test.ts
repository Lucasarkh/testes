import { describe, expect, it } from 'vitest'

import {
  isKnownPlatformHostname,
  isPrivateNetworkHostname,
  normalizeHostname,
} from '~/utils/host'

describe('host utils', () => {
  describe('normalizeHostname', () => {
    it('normalizes protocol, port and path', () => {
      expect(normalizeHostname('https://WWW.LOTIO.COM.BR:3000/demo')).toBe('www.lotio.com.br')
    })

    it('normalizes bracketed loopback ipv6 values', () => {
      expect(normalizeHostname('[::1]:3000')).toBe('::1')
    })
  })

  describe('isPrivateNetworkHostname', () => {
    it('accepts local development hosts opened from mobile', () => {
      expect(isPrivateNetworkHostname('localhost')).toBe(true)
      expect(isPrivateNetworkHostname('127.0.0.1')).toBe(true)
      expect(isPrivateNetworkHostname('192.168.0.15')).toBe(true)
      expect(isPrivateNetworkHostname('10.0.0.25')).toBe(true)
      expect(isPrivateNetworkHostname('172.20.10.3')).toBe(true)
      expect(isPrivateNetworkHostname('lotio.local')).toBe(true)
    })

    it('rejects public internet hosts', () => {
      expect(isPrivateNetworkHostname('lotio.com.br')).toBe(false)
      expect(isPrivateNetworkHostname('cliente.com.br')).toBe(false)
      expect(isPrivateNetworkHostname('8.8.8.8')).toBe(false)
      expect(isPrivateNetworkHostname('172.32.0.10')).toBe(false)
    })
  })

  describe('isKnownPlatformHostname', () => {
    const siteOrigin = 'https://lotio.com.br'

    it('keeps production platform hosts classified as platform', () => {
      expect(isKnownPlatformHostname('lotio.com.br', siteOrigin)).toBe(true)
      expect(isKnownPlatformHostname('www.lotio.com.br', siteOrigin)).toBe(true)
    })

    it('does not classify custom production domains as platform', () => {
      expect(isKnownPlatformHostname('vendas.cliente.com.br', siteOrigin)).toBe(false)
      expect(isKnownPlatformHostname('cliente.com.br', siteOrigin)).toBe(false)
    })

    it('treats LAN and loopback hosts as platform in development', () => {
      expect(isKnownPlatformHostname('192.168.0.15:3000', siteOrigin)).toBe(true)
      expect(isKnownPlatformHostname('10.0.0.4:3000', siteOrigin)).toBe(true)
      expect(isKnownPlatformHostname('localhost:3000', siteOrigin)).toBe(true)
    })
  })
})