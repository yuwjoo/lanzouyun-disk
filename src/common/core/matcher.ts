import * as cheerio from 'cheerio'
import prettier from 'prettier/standalone'
import parserBabel from 'prettier/parser-babel'
import queryString from 'querystring'
import type {Method} from 'got/dist/source/core/options'
import {CheerioAPI} from 'cheerio/lib/load'

interface AjaxData {
  type: Method
  url: string
  data: any
}

type ParseInput = string | CheerioAPI

const blackList = [/jquery\.js/, /qrcode\.min\.js/, /bd\.js/, /hm\.js/]

/**
 * 获取页面各种元素
 */
export class Matcher {
  static matchIframe(html: string) {
    return cheerio.load(html)('iframe').attr()?.src
  }

  static scriptToText = (sources: string[]) => {
    return Promise.all(
      sources.map(src =>
        fetch(src)
          .then(value => value.text())
          .catch(() => '')
      )
    ).then(value => value.join('\n'))
  }

  static format(script: string) {
    script = script.replace(/<!--.+?-->/g, '')
    try {
      return (
        prettier.format(script, {
          plugins: [parserBabel],
          parser: 'babel',
          semi: true, // 加上分号
          trailingComma: 'none', // 不加尾逗号
          singleQuote: false, // 使用双冒号
          printWidth: 1000, // 为了让代码尽量不换行
        }) + '\n'
      )
    } catch (e) {
      return ''
    }
  }

  /**
   * 规范化获取 script
   */
  static async formatScript(html: ParseInput): Promise<[string, string]> {
    const $ = typeof html === 'string' ? cheerio.load(html) : html
    const $$ = $('html script')

    const sources = $$.map((_, el) => $(el).attr('src'))
      .toArray()
      .filter(src => src && blackList.every(reg => !reg.test(src)))

    const $scripts = $$.filter((_, el) => !$(el).attr('src'))

    if (!$scripts.length) return ['', '']

    const extraScript = await this.scriptToText(sources).then(this.format)

    return [
      // 执行脚本
      [...$scripts.map((i, el) => this.format($(el).html()))].filter(Boolean).join('\n'),
      // 前置脚本
      extraScript,
    ]
  }

  /**
   * script -> ajaxData
   * getVariable:
   *  拼凑变量值，防止报错；如：_ => `var pgs = 1;`
   *  或者使用正则匹配
   * getData:
   *  获取 ajax 的 data 参数
   */
  static async parseAjaxData(
    html: ParseInput,
    getVariable: (script: string) => string,
    getData: (script: string) => string
  ): Promise<AjaxData> {
    const [script, extra] = await this.formatScript(html)

    const variable = getVariable(script)
    const data = getData(script)
    const body = eval(`(() => {${extra}${variable}return ${data}})()`)

    if (typeof body.data === 'string') {
      body.data = queryString.parse(body.data)
    }
    return body
  }

  /**
   * 文件夹：无密码/带密码
   * @return object 返回值不包含 pwd
   */
  static parseFolderAjax(html: string) {
    return this.parseAjaxData(
      html,
      script =>
        script
          .replace(/function sms[\s\S]+?}/, '') // vip 目录 folder-pwd-vip.html
          .replace(/\$\(document\)\.keyup[\s\S]+?}\);/, '') // vip 目录 folder-pwd-vip.html
          .match(/([\s\S]+?)(function )?file\(\)/)?.[1] // 或者使用 pgs = 1;
          .replace(/document\..+?;/g, ''),
      script => script.replace(/function more\(\) {[\s\S]+}/, '').match(/\$\.ajax\(({[\s\S]+})\);/)?.[1]
    )
  }

  /**
   * 文件：无密码
   *
   * data 为 object 类型
   */
  static parseAjax(html: string) {
    const cleanReg = /function .+?\(\) {[\s\S]+?}\n/g
    return this.parseAjaxData(
      html,
      script => script.replace(cleanReg, '').match(/([\s\S]+)\$\.ajax/)[1],
      script => script.replace(cleanReg, '').match(/\$\.ajax\(([\s\S]+)\)/)[1]
    )
  }

  /**
   * 文件：带密码
   *
   * data 由 string 转为 object 类型
   */
  static parsePwdAjax(html: string, password = '') {
    const cleanReg = /function down_p\(\) {([\s\S]+?)\n}\n/
    return this.parseAjaxData(
      html,
      script =>
        script
          .match(cleanReg)?.[1]
          ?.replace(/var pwd.*?\n/, `var pwd = "${password}";\n`)
          .match(/([\s\S]+)\$\.ajax/)[1],
      script => script.match(cleanReg)?.[1]?.match(/\$\.ajax\(({[\s\S]+?})\);/)?.[1]
    )
  }

  /**
   * 下载验证页面的参数
   */
  static async parseValidateAjax(html: string) {
    const $ = cheerio.load(html)
    const [format] = await this.formatScript($)
    const elKey = format.match(/function .+?\((.+?)\)/)?.[1]
    const id = format.match(/\$\("(.+)"\).+提交中/)?.[1]
    if (!id) return null
    const fn = $(`${id} div`).attr('onclick')
    if (!fn) return null

    const elValue = fn.match(/\((.+)\)/)?.[1]
    return this.parseAjaxData(
      $,
      () => `var ${elKey} = ${elValue};`,
      script => script.match(/\$\.ajax\(({[\s\S]+})\);/)?.[1]
    )
  }

  /**
   * 获取请求文件列表的参数
   */
  static parseFileMoreAjax(html: string) {
    return this.parseAjaxData(
      html,
      () => `var pgs = 1; var folder_id = '';`,
      script => script.replace(/\$\.each\([\s\S]+?}\);/g, '').match(/\$\.ajax\(({[\s\S]+?})\);/)?.[1]
    )
  }

  static parseErrorPage(html: string) {
    const $ = cheerio.load(html)
    return $('.off').text()
  }
}

// const html = fs.readFileSync('docs/pages/0513/folder-pwd-vip.html').toString()
// console.log('html', Matcher.parseFolderAjax(html))
