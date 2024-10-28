import config, {supportList} from '../project.config'
import type {Request} from 'got'

export const delay = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms))

// 95.0 M
export function sizeToByte(size: string, step = 1024) {
  if (!size) return 0
  const getUnit = unit =>
    ({
      get b() {
        return 1
      },
      get k() {
        return step
      },
      get m() {
        return this.k * step
      },
      get g() {
        return this.m * step
      },
      get t() {
        return this.g * step
      },
    }[unit] || 1) // todo: 1 是有问题的
  const [, num, unit] = size
    .toLowerCase()
    .replaceAll(' ', '')
    .replaceAll(',', '')
    .match(/^(\d+\.?\d*)([bkmgt]?)$/)

  return +num * getUnit(unit)
}

export function byteToSize(byte: number, step = 1024) {
  const formatSize = (total, persize) => {
    const [integer, decimal = ''] = `${Math.floor((total * 100) / persize) / 100}`.split('.')
    return `${integer}.${decimal.padEnd(2, '0')}`
  }

  if (byte < sizeToByte('1k', step)) return `0`
  if (byte < sizeToByte('1m', step)) return `${formatSize(byte, sizeToByte('1k', step))} K`
  if (byte < sizeToByte('1g', step)) return `${formatSize(byte, sizeToByte('1m', step))} M`
  if (byte < sizeToByte('1t', step)) return `${formatSize(byte, sizeToByte('1g', step))} G`
}

// const suffix = ['zip', 'tar', 'rar']
function randomItem(list: string[]) {
  return list[Math.round(Math.random() * (list.length - 1))]
}

/**
 * 前面不带 .
 * 例如: xxx.yyy
 */
export function getSuffix() {
  return `${randomItem(config.safeSuffixList)}.${randomItem(config.safeSuffixList)}`
}

/**
 * whether it is special file
 * 未命名.png.epub.zip
 */
export function isSpecificFile(name: string) {
  if (!name) return false

  // 兼容 v1 版本
  if (name.endsWith('.lzy.zip')) {
    name = name.replace(/\.lzy\.zip$/, '')
    return !/\d$/.test(name)
  }

  // v2: .原后缀.后缀.后缀
  const ext = supportList.find(value => name.endsWith(`.${value}`))
  if (ext) {
    name = name.replace(/\.\w+?$/, '')
    const ends = supportList.find(value => name.endsWith(`.${value}`))
    if (ends) {
      name = name.replace(/\.\w+?$/, '')
      if (/\.\d+$/.test(name)) return false
      return /\.\w+$/.test(name)
    }
  }
  return false
}

export function restoreFileName(name: string) {
  if (isSpecificFile(name)) {
    return name.replace(/\.\w+?\.\w+$/, '')
  }
  return name
}

// 移除文件名的非法字符
export function fixFileName(name: string) {
  if (!name) return name
  return name.replace(/[\\/:*?"<>|]/g, '_')
}

/**
 * 1.22.3.dmg.t4iso.tar
 * suffix 无需带 .
 */
export function createSpecificIndexName(fileName: string, suffix: string, index: number, total: number) {
  // const sign = suffix.split('.').pop()?.[0]
  // const padLength = `${total}`.length
  // return `${fileName}.${sign}${`${index}`.padStart(padLength, '0')}${suffix}`
  const padLength = `${total}`.length
  return `${fileName}.${`${index}`.padStart(padLength, '0')}.${suffix}`
}

export function createSpecificName(fileName: string) {
  return `${fileName}.${getSuffix()}`
}

export function isFile(name: string) {
  return /\.[0-9a-zA-Z]+$/.test(name)
}

export function streamToText(stream: Request) {
  return new Promise<string>((resolve, reject) => {
    stream.setEncoding('utf-8')
    let data = ''
    stream.on('data', chunk => {
      data += chunk.toString()
    })
    stream.once('end', () => resolve(data))
    stream.once('error', err => reject(err))
  })
}

// 异步 map，可控制并发
export async function asyncMap<T, R>(
  array: T[],
  asyncCallback: (value: T, index: number) => Promise<R>,
  options = {} as {thread: number}
): Promise<R[]> {
  const thread = options.thread || 2
  const data = []
  for (let i = 0; i < array.length; i += thread) {
    const nextThread = i + (thread - 1) < array.length ? thread : array.length - i
    const values = await Promise.all(
      Array.from({length: nextThread}).map((_, index) => asyncCallback(array[i + index], i + index))
    )
    data.push(...values)
  }
  return data
}

/**
 * 数组 filter 的异步版本
 */
export async function asyncFilter<T>(
  array: T[],
  asyncCallback: (value: T, index: number) => Promise<boolean>,
  options = {} as {thread: number}
): Promise<T[]> {
  const thread = options.thread || 1
  const data = []
  for (let i = 0; i < array.length; i += thread) {
    const nextThread = i + (thread - 1) < array.length ? thread : array.length - i
    const values = await Promise.all(
      Array.from({length: nextThread}).map((_, index) => asyncCallback(array[i + index], i + index))
    )
    for (let j = 0; j < values.length; j++) {
      if (values[j]) {
        data.push(array[i + j])
      }
    }
  }
  return data
}

/**
 * 解析分享链接
 * @param url
 */
export function parseShare(url: string): {url: string; pwd?: string} {
  return url
    .slice(url.indexOf('http'))
    .split(' ')
    .filter(value => value)
    .reduce<string[]>((prev, item, i) => {
      if (i === 0) return [item]
      return [prev[0], (prev[1] += item)]
    }, [])
    .reduce((prev, item) => {
      if (item.startsWith('http')) {
        return {...prev, url: item}
      }
      if (/[:：]/.test(item)) {
        return {...prev, pwd: item.replace('：', ':').split(':').pop()}
      }
      return prev
    }, null as {url: string; pwd?: string})
}
