/*!
 * Name: Weapp-Axios
 * Version: v1.0.0
 * Description: 微信小程序requestAPI的封装
 * Author: Liu Jiachang
 *
 * wx.request API
 * https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
 *
 * wx.uploadFile API
 * https://developers.weixin.qq.com/miniprogram/dev/api/network/upload/wx.uploadFile.html
 *
 * wx.downloadFile API
 * https://developers.weixin.qq.com/miniprogram/dev/api/network/download/wx.downloadFile.html
 *
 * Axios API
 * http://www.axios-js.com/zh-cn/docs/#axios
 */

/**
 * @example
 *
 * 向axios传递相关配置来创建请求
 * axios(config)
 *
 * 发起 wx.request 请求（默认为GET请求）
 *
 * axios('/user/12345')
 * axios({ method: 'post', url: '/user/12345', data: { firstName: 'Fred' } })
 *
 * 使用别名
 * axios.request(config)
 * axios.get(url[, data[, config]])
 * axios.delete(url[, data[, config]])
 * axios.head(url[, data[, config]])
 * axios.options(url[, data[, config]])
 * axios.post(url[, data[, config]])
 * axios.put(url[, data[, config]])
 * axios.patch(url[, data[, config]])
 *
 * 发起 wx.uploadFile 请求
 *
 * 传入 name 以及 filePath 参数会自动发起 wx.uploadFile 请求
 * axios({ url: 'www.abc.com', name: 'name', filePath: 'filePath' })
 *
 * 使用别名
 * axios.uploadFile('www.abc.com', 'filePath', 'name', {...config})
 * axios.uploadFile({ url: 'www.abc.com', filePath: 'filePath', name: 'name', ...config })
 *
 * 发起 wx.downloadFile 请求
 *
 * 传入 filePath 参数会自动发起 wx.downloadFile 请求（wx.downloadFile中的 filePath 为非必填项，可传入空值）
 * axios({ url: 'www.abc.com', filePath: '' })
 *
 * 使用别名
 * axios.downloadFile('www.abc.com', 'filePath', 'name', {...config})
 * axios.downloadFile({ url: 'www.abc.com', filePath: 'filePath', name: 'name', ...config })
 * 
 * 发起 wx.connectSocket 请求
 * axios.connectSocket('www.abc.com', {...config})
 * axios.connectSocket({ url: 'www.abc.com', ...config })
 * 
 * 
 * 处理 Task 任务对象
 * wx.request\wx.uploadFile\wx.downloadFile\wx.connectSocket 拥有相同的处理方法
 * 在 config 内传入包含官方文档内合法Task方法的 task 对象
 * 
 * axios.downloadFile({
 *  url: 'www.abc.com',
 *  task: {
 *    // task对象键值命名必须与官方文档Task提供的函数名一致
 *    onProgressUpdate: (res, task) => {
 *      // 使用自定义函数接收参数
 *      yourOnProgressUpdateFun(res, task)
 *    },
 *    offProgressUpdate: (res, task) => {
 *      yourOffProgressUpdateFunc(res, task)
 *    },
 *    // 如果不是on监听事件的回调函数，axios传入的是task对象
 *    abort: task => {
 *      yourAbortFunc(task)
 *    },
 *  },
 * });
 * function yourAbortFunc(task) {
 *  if (true) {
 *    task.abort()
 *  }
 * }
 */

const name = 'Weapp-Axios'
const root = typeof globalThis === 'object' && globalThis !== null && globalThis.Object === Object && globalThis
const objProto = Object.prototype
const arrProto = Array.prototype
const noop = function() {}

if (!objProto.hasOwnProperty.call(root, 'wx')) {
  throw `[${name}] 仅支持在微信小程序环境中运行！`
}

const wx = Object.create(root.wx)

// 小程序帐号信息
// https://developers.weixin.qq.com/miniprogram/dev/api/open-api/account-info/wx.getAccountInfoSync.html#%E8%BF%94%E5%9B%9E%E5%80%BC
const envVersion = wx.getAccountInfoSync().miniProgram.envVersion
const isDevelop = envVersion === 'develop'
const isTrial = envVersion === 'trial'
const isRelease = envVersion === 'release'

// 匹配头部的斜杠
const reHeadSlash = /^\/+/
// 匹配尾部的斜杠
const reFootSlash = /\/+$/
// 匹配绝对地址
const reAbsoluteURL = /^([a-z][a-z\d\+\-\*]*:)?\/\//i
// 匹配非数字
const reNotNumber = /[\D]/g

// 错误信息
const nonConfigError = `[${name}] 未传入配置对象！`

// HTTP 请求方法
const methods = ['OPTIONS', 'GET', 'HEAD', 'POST', 'PUT', 'DELETE']
const DEFAULT_METHOD = 'GET'
const DEFAULT_HEADER = {
  'content-type': 'application/json'
}

// 日志最大保存天数
const MAX_LOG_DAY = 7
// 日志最大保存数量
const MAX_LOG_COUNTS = 300

// 公共工具函数
const utils = {
  /**
   * 检查value是否为可迭代的数组类型
   *
   * @param {*} value
   * @returns {Boolean} true or false
   *
   * @example
   *
   * [1, 2, 3] // true
   * '123' // true
   * arguments // true
   */
  isArrayLike: function isArrayLike(value) {
    return value !== null && typeof value !== 'function' && objProto.hasOwnProperty.call(value, 'length')
  },

  /**
   * 检查value是否为普通对象
   *
   * @param {*} value
   * @returns {Boolean} true or false
   *
   * @example
   *
   * {a: 1} // true
   * ['a', 1] // false
   * function() {} // false
   */
  isPlainObject: function isPlainObject(value) {
    if (utils.getTag(value) !== '[object Object]') {
      return false
    }
    let prototype = Object.getPrototypeOf(value)
    return prototype === null || prototype === Object.prototype
  },

  /**
   * 检查value是否为字符串类型
   *
   * @param {*} value
   * @returns {Boolean} true or false
   *
   * @example
   *
   * 'abc' // true
   * new String('abc') // true
   */
  isString: function isString(value) {
    const typeOf = typeof value
    return typeOf === 'string' || (typeOf === 'object' && value !== null && !Array.isArray(value) && utils.getTag(value) === '[object String]')
  },

  /**
   * 检查value是否为函数类型
   *
   * @param {*} value
   * @returns {Boolean} true or false
   */
  isFunction: function isFunction(value) {
    return typeof value === 'function'
  },

  /**
   * 获取value的数据类型
   *
   * @param {*} value
   * @returns {Strint} '[Object ?]'
   */
  getTag: function getTag(value) {
    if (value === null) {
      return value === undefined ? '[object Undefined]' : '[object Null]'
    }
    return objProto.toString.call(value)
  },

  /**
   * 合并对象
   * 如果有相同键名，后面的覆盖前面的
   *
   * @returns {Object} 合并后的对象
   */
  merge: function merge() {
    let result = {}

    function assignValue(value, key) {
      if (utils.isPlainObject(result[key]) && utils.isPlainObject(value)) {
        result[key] = merge(result[key], value)
      } else if (utils.isPlainObject(value)) {
        result[key] = merge({}, value)
      } else if (Array.isArray(value)) {
        result[key] = value.slice()
      } else {
        result[key] = value
      }
    }

    let args = arrProto.slice.call(arguments)
    for (let i = 0; i < args.length; i++) {
      utils.each(args[i], assignValue)
    }

    return result
  },

  /**
   * 迭代函数
   * 可遍历数组/类数组/对象
   *
   * @param {Array|Object} collection
   * @returns {Array|Object} collection
   */
  each: function each(collection, iteratee) {
    if (collection === null) {
      return collection
    }

    if (!utils.isArrayLike(collection)) {
      return utils.forOwn(collection, iteratee)
    }

    const iterable = Object(collection)
    const length = collection.length
    let index = -1
    while (++index < length) {
      if (iteratee(iterable[index], index, iterable) === false) {
        break
      }
    }

    return collection
  },

  /**
   * 迭代对象
   *
   * @param {Object} object 需要遍历的对象
   * @param {Function} iteratee 迭代函数
   * @returns {Object} object
   */
  forOwn: function forOwn(object, iteratee) {
    const iterable = Object(object)
    const keys = Object.keys(object)
    let { length } = keys
    let index = -1

    while (length--) {
      const key = keys[++index]
      if (iteratee(iterable[key], key, iterable) === false) {
        break
      }
    }

    return object
  },

  // base64编码
  base64Encode: function base64Encode (str) { // 编码，配合encodeURIComponent使用
    let c1, c2, c3
    let base64EncodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
    let i = 0, len = str.length, strin = ''
    while (i < len) {
      c1 = str.charCodeAt(i++) & 0xff
      if (i == len) {
        strin += base64EncodeChars.charAt(c1 >> 2)
        strin += base64EncodeChars.charAt((c1 & 0x3) << 4)
        strin += "=="
        break
      }
      c2 = str.charCodeAt(i++)
      if (i == len) {
        strin += base64EncodeChars.charAt(c1 >> 2)
        strin += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4))
        strin += base64EncodeChars.charAt((c2 & 0xF) << 2)
        strin += "="
        break
      }
      c3 = str.charCodeAt(i++)
      strin += base64EncodeChars.charAt(c1 >> 2)
      strin += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4))
      strin += base64EncodeChars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6))
      strin += base64EncodeChars.charAt(c3 & 0x3F)
    }
    return strin
  },
}

// 助手函数
const helpers = {
  /**
   * 合并配置对象
   * config2合并至config1
   * 键名相同，config2的值覆盖config1的值
   *
   * @param {Object} config1
   * @param {Object} config2
   * @returns {Object} config 合并后的配置对象
   */
  mergeConfig: function mergeConfig(config1, config2) {
    return utils.merge(config1, config2)
  },

  /**
   * 判断一个地址是否为绝对地址
   * 如果一个地址以"<scheme>://" or "//"开头，则代表它是一个绝对地址
   *
   * @param {String} url
   * @returns {Boolean} true or false
   */
  isAbsoluteURL(url) {
    return reAbsoluteURL.test(url)
  },

  /**
   * 地址拼接
   *
   * @param {String} url1
   * @param {String} url2
   * @returns {String} url 拼接后的新地址 /a/b/c/ + /x/y/z => /a/b/c/x/y/z
   */
  combineURLs: function combineURLs(url1, url2) {
    if (!url1 || !url2) return ''

    url1 = url1 + ''
    url2 = url2 + ''

    return url1.replace(reFootSlash, '') + '/' + url2.replace(reHeadSlash, '')
  },

  /**
   * 构建URL地址参数
   *
   * @param {String} url 请求地址
   * @param {Object|String} params 请求参数
   * @returns {String} 带参数的URL地址
   *
   * 支持以下两种形式的参数结构
   * /a/b/c + /x/y/z => /a/b/c/x/y/z
   * /a/b/c + {x:1, y: 2, z: 3} => /a/b/c?x=1&y=2&z=3
   */
  buildPathParam: function buildPathParam(url, params) {
    if (!url) return ''

    url = url + ''

    if (utils.isPlainObject(params)) {
      const keys = Object.keys(params)
      // 判断url中是否已经有?形式的参数了
      // ~indexOf -1 => 0 1 => -2
      const isExist = !!~url.indexOf('=')
      let suffix = ''
      keys.forEach((key, index) => {
        if (!utils.isFunction(params[key])) {
          suffix += ((!isExist && index === 0 ? '' : '&') + (key + '=' + params[key]))
        }
      })
      return helpers.combineURLs(url, '?' + suffix)
    } else {
      return helpers.combineURLs(url, params + '')
    }
  },

  /**
   * 构建完整的URL地址
   *
   * @param {String} baseURL 基地址
   * @param {String} url 请求地址
   * @returns {String} 完整的URL地址 https://www.xxx.com/ + /a/b/c => https://www.xxx.com/a/b/c
   */
  buildFullPath: function buildFullPath(baseURL, url) {
    if (!baseURL) return ''

    if (!url) return baseURL

    baseURL = baseURL + ''
    url = url + ''

    return helpers.isAbsoluteURL(url)
            ? url
            : helpers.combineURLs(baseURL, url)
  },
}

/** 拦截器 */

/**
 * 拦截器管理类
 */
function InterceptorManager() {
  this.handlers = []
}

/**
 * 将拦截器推入栈中
 *
 * @param {Function} fulfilled 处理 Promise 返回 then 的逻辑
 * @param {Function} rejected 处理 Promise 返回 reject 的逻辑
 * @param {Object} options 额外处理的参数
 * @returns {Number} 当前拦截器ID，可用于后续删除操作
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  })
  return this.handlers.length - 1
}

/**
 * 删除拦截器
 *
 * @param {*} id 拦截器ID
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null
  }
}

/**
 * 遍历已注册的拦截器
 *
 * @param {Function} fn 处理拦截器的方法
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.each(this.handlers, function eachHandler(h) {
    if (h !== null) {
      fn(h)
    }
  })
}


/** 适配器 */

/**
 * 给发起请求的适配器打上装饰函数
 * 
 * @param {Function} fn 需要装饰的函数
 * @returns Function
 */
const adapterDecorator = function adapterDecorator(fn) {
  if (!utils.isFunction(fn)) {
    throw Error(`[${name}] adapterDecorator 必须传入函数类型参数！`)
  }

  const decorators = arrProto.slice.call(arguments, 1)

  return function adapterDecoratorFn() {
    let { length } = decorators
    let index = -1
    let rets = Array.from({ length }, () => null) || []
    while (++index < length) {
      rets[index] = utils.isFunction(decorators[index])
                      ? decorators[index].apply(this, arguments)
                      : undefined
    }
    return fn.apply(this, rets)
  }
}

/**
 * wx.request请求适配器
 *
 * @param {Object} config 配置对象
 * @returns Promise对象
 */
function requestAdapter(config) {
  config = config || {}

  // 参数与adapterDecorator中调用的装饰器函数返回值一致
  function sendRequest(url, header) {
    return new Promise(function sendWXRequest(resolve, reject) {
      // 发起请求
      const request = wx.request
      const requestTask = request({
        url,
        header,
        data: config.data || {},
        dataType: config.dataType,
        method: config.method,
        responseType: config.responseType,
        timeout: config.timeout,
        enableCache: config.enableCache,
        enableHttp2: config.enableHttp2,
        enableQuic: config.enableQuic,
        success: res => { adapterCallbackSettle(resolve, res) },
        fail: err => { adapterCallbackSettle(reject, err) },
        complete: () => { adapterCallbackSettle() },
      })
      // 请求任务
      // https://developers.weixin.qq.com/miniprogram/dev/api/network/request/RequestTask.html
      if (config.task) {
        adapterTaskSettle(requestTask, config.task, config)
      }
    })
  }

  // 路径、Authorization不同适配器会有部分差异，不在dispatchRequest函数中进行处理
  // 使用装饰器将获得url路径、header.Authorization的逻辑与发起请求的逻辑进行分离
  const requestAdapterHandler = adapterDecorator(sendRequest, setFullPathURL, setAuthorizationHeader)

  return requestAdapterHandler(config)
}

/**
 * wx.uploadFile 请求适配器
 *
 * @param {Object} config 配置对象
 * @returns Promise对象
 */
function uploadFileAdapter(config) {
  config = config || {}

  if (!config.name || !config.filePath) {
    throw Error(`[${name}] wx.uploadFile 需要传入 name filePath 属性！`)
  }

  function sendRequest(url, header) {
    return new Promise(function sendWXUploadFile(resolve, reject) {
      // wx.uploadFile 的 content-type 必须为 multipart/form-data
      header['content-type'] = 'multipart/form-data'
      // 发起请求
      const request = wx.uploadFile
      const requestTask = request({
        method: 'POST',
        url,
        header,
        name: config.name,
        filePath: config.filePath,
        timeout: config.timeout,
        success: res => { adapterCallbackSettle(resolve, res) },
        fail: err => { adapterCallbackSettle(reject, err) },
        complete: () => { adapterCallbackSettle() },
      })
      // 请求任务
      if (config.task) {
        adapterTaskSettle(requestTask, config.task, config)
      }
    })
  }

  const uploadFileAdapterHandler = adapterDecorator(sendRequest, setFullPathURL, setAuthorizationHeader)

  return uploadFileAdapterHandler(config)
}

/**
 * wx.downloadFile 请求适配器
 *
 * @param {Object} config 配置对象
 * @returns Promise对象
 */
function downloadFileAdapter(config) {
  config = config || {}

  function sendRequest(url, header) {
    return new Promise(function sendWXDownloadFile(resolve, reject) {
      // 发起请求
      const request = wx.downloadFile
      const requestTask = request({
        method: 'GET',
        url,
        header,
        filePath: config.filePath || '',
        timeout: config.timeout,
        success: res => { adapterCallbackSettle(resolve, res) },
        fail: err => { adapterCallbackSettle(reject, err) },
        complete: () => { adapterCallbackSettle() },
      })
      // 请求任务
      if (config.task) {
        adapterTaskSettle(requestTask, config.task, config)
      }
    })
  }

  const downloadFileAdapterHandler = adapterDecorator(sendRequest, setFullPathURL, setAuthorizationHeader)

  return downloadFileAdapterHandler(config)
}

/**
 * wx.connectSocket 请求适配器
 *
 * @param {Object} config 配置对象
 * @returns Promise对象
 */
function connectSocketAdapter(config) {
  config = config || {}

  function sendRequest(url, header) {
    return new Promise(function sendWXConnectSocket(resolve, reject) {
      // 发起请求
      const request = wx.connectSocket
      const requestTask = request({
        url,
        header,
        protocols: config.protocols,
        tcpNoDelay: config.tcpNoDelay || false,
        perMessageDeflate: config.perMessageDeflate || false,
        timeout: config.timeout,
        success: res => { adapterCallbackSettle(resolve, res) },
        fail: err => { adapterCallbackSettle(reject, err) },
        complete: () => { adapterCallbackSettle() },
      })
      // 请求任务
      if (config.task) {
        adapterTaskSettle(requestTask, config.task, config)
      }
    })
  }

  const connectSocketAdapterHandler = adapterDecorator(sendRequest, setFullPathURL, setAuthorizationHeader)

  return connectSocketAdapterHandler(config)
}

/**
 * 设置 URL 完整路径
 *
 * @param {Object} config 配置对象
 */
function setFullPathURL(config) {
  let fullPath = config.baseURL
  if (config.params && config.url) {
    config.url = helpers.buildPathParam(config.url, config.params)
  }
  if (config.url) {
    fullPath = helpers.buildFullPath(config.baseURL, config.url)
  }
  return fullPath
}

/**
 * 设置 header.Authorization 参数
 *
 * @param {Object} config 配置对象
 */
function setAuthorizationHeader(config) {
  let requestHeader = config.header || {}
  if (config.auth || config.token) {
    const getAuthorization = function(config) {
      let authorization = ''
      // 处理 HTTP Basic Auth
      if (config.auth) {
        const username = config.auth.username || ''
        const password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : ''
        authorization = 'Basic ' + utils.base64Encode(username + ':' + password)
      }
      // 处理 HTTP Bearer Token
      if (config.token) {
        authorization = 'Bearer ' + config.token
      }
      return authorization
    }
    requestHeader.Authorization = getAuthorization(config)
  }
  return requestHeader
}

/**
 * 请求适配器调用成功、失败、完成后的回调事件
 */
function adapterCallbackSettle() {
  arguments.length < 2
    ? noop()
    : utils.isFunction(arguments[0])
        ? arrProto.shift.call(arguments).call(this, arrProto.shift.call(arguments) || {})
        : noop()
}

/**
 * 请求适配器任务处理
 * @param {Object} requestTask 请求任务对象
 * @param {Object} configTask 配置任务对象
 * @param {Object} config 配置对象
 */
function adapterTaskSettle(requestTask, configTask, config) {
  if (!requestTask) {
    return undefined
  }

  if (!utils.isPlainObject(configTask)) {
    configTask = {}
  }

  function localPrint(c, k, r) {
    if (c && c.openLocalPrinter) {
      c.printManager.printTask(c, k, r)
    }
  }

  // abort 属于 wx.request\wx.uploadFile\wx.downloadFile 任务对象
  // close\send 属于 wx.connectSocket 任务对象
  const legalTasks = ['abort', 'close', 'send']
  // onProgressUpdate\offProgressUpdate 属于 wx.uploadFile\wx.downloadFile 任务对象回调
  // onHeadersReceived\offHeadersReceived 属于 wx.request\wx.uploadFile\wx.downloadFile 任务对象回调
  // onChunkReceived\offChunkReceived 属于 wx.request 任务对象回调
  // onOpen\onMessage\onError\onClose 属于 wx.connectSocket 任务对象回调
  const legalCallbackTasks = ['onProgressUpdate', 'offProgressUpdate', 'onHeadersReceived', 'offHeadersReceived', 'onChunkReceived', 'offChunkReceived', 'onOpen', 'onMessage', 'onError', 'onClose']

  utils.each(configTask, function setRequestTask(value, key) {
    if (utils.isFunction(value) && configTask[key]) {
      if (legalCallbackTasks.includes(key)) {
        requestTask[key](function requestTaskCallback(res) {
          configTask[key].apply(this, [res, requestTask])
          localPrint(config, key, res)
        })
      } else {
        configTask[key].call(this, requestTask)
      }
    }
  })
}

/**
 * 获取适配器
 *
 * @param {Object} config 配置对象
 */
function getDefaultAdapter(config) {
  if (!config) {
    throw Error(nonConfigError)
  }

  let adapter
  let adapterName
  // 使用 wx.uploadFile\wx.downloadFile\wx.connectSocket 特有的参数字段进行判断
  // 如果config有 name、filePath 属性，则认为当前使用了 wx.uploadFile 接口
  // 如果config只有 filePath 属性，则认为当前使用了 wx.downloadFile 接口
  // 如果config只有 protocols 属性，则认为当前使用了 wx.connectSocket 接口
  // 如果config没有 name、filePath、protocols 属性，则认为当前使用了 wx.request 接口
  if (config.name && config.filePath) {
    adapter = uploadFileAdapter
    adapterName = 'wx.uploadFile'
  } else if (!config.name && objProto.hasOwnProperty.call(config, 'filePath')) {
    adapter = downloadFileAdapter
    adapterName = 'wx.downloadFile'
  } else if (objProto.hasOwnProperty.call(config, 'protocols')) {
    adapter = connectSocketAdapter
    adapterName = 'wx.connectSocket'
  } else {
    adapter = requestAdapter
    adapterName = 'wx.request'
  }
  return { adapter, adapterName }
}


/** 默认配置 */

const defaults = {
  // 使用单例模式进行实例化
  // 在单例模式下，类仅有一个实例，实例化时传入的参数也只会在第一次生效
  useSingleton: true,

  // 配置适配器，兼容 wx.reqeust\wx.uploadFile\wx.downloadFile 请求
  adapter: getDefaultAdapter,

  // 超时时间
  timeout: 0,

  // 设置请求的 header
  header: {
    common: DEFAULT_HEADER
  },

  // 响应数据强制转化为json格式
  forcedJSONParsing: true,

  // 本地打印
  openLocalPrinter: !isRelease,
  printManager: !isRelease ? new PrintManager('log') : undefined,

  // 本地日志
  openLocalLogger: !isRelease,
  logManager: !isRelease ? new LogManager() : undefined,

  // 定义对于给定的HTTP 响应状态码是 resolve 或 reject  promise
  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300
  }
}

// 根据请求方法设置默认header
utils.each(methods, function setMethodHeader(method){
  defaults.header[method] = DEFAULT_HEADER
})


/** 本地打印、日志缓存 */

/**
 * 打印管理
 */
function PrintManager(level) {
  this.name = name
  this.level = level || 'log'
  this.print = root.console[this.level]
}

PrintManager.prototype.header = function head(color='#67c23a') {
  this.print(`%c[${this.name}]↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓`, `color: ${color}`)
}

PrintManager.prototype.footer = function head(color='#67c23a') {
  this.print('%c↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑', `color: ${color}`)
}

PrintManager.prototype.time = function time() {
  return new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
}

// 打印请求
PrintManager.prototype.printRequest = function printRequest(config, response) {
  if (!config) {
    return undefined
  }

  const { print } = this
  this.header()
  if (response && response.statusCode && !config.validateStatus(response.statusCode)) {
    print(`%cstatusCode：${response.statusCode}`, 'color: #fa5151;font-size:21px;')
  }
  print('=> 请求路径：', config.url || config.baseURL)
  if (config.method) {
    print('=> 请求方式：', config.method)
  }
  print('=> 配置参数：', config || {})
  if (Object.keys(config.data).length > 0) {
    print('=> 请求参数：', config.data || {})
  }
  print('=> 响应结果：', response || {})
  print('=> 打印时间：', this.time())
  this.footer()
}

// 打印请求任务
PrintManager.prototype.printTask = function printTask(config, key, response) {
  if (!config || !key) {
    return undefined
  }

  const { print } = this
  this.header('#e6a23c')
  print('=> 监听事件：', key)
  print('=> 请求路径：', config.url || config.baseURL)
  print('=> 配置参数：', config || {})
  if (Object.keys(config.data).length > 0) {
    print('=> 请求参数：', config.data || {})
  }
  print('=> 回调结果：', response || {})
  print('=> 打印时间：', this.time())
  this.footer('#e6a23c')
}

/**
 * 日志管理
 */
function LogManager() {
  this.name = name
}

LogManager.prototype.set = function set(config, response) {
  if (!config) return undefined

  let logs = this.get() || []
  if (logs.length > MAX_LOG_DAY - 1) {
    logs = this.popleft()
  }

  const finalValue = config.adapterName + ',' + response.statusCode + ',' + config.method + ',' + config.baseURL + config.url + ',' + Date.now() + ',' + new Date().toLocaleTimeString()

  const date = (new Date().toLocaleDateString()).replace(reNotNumber, '')
  let index = -1
  utils.each(logs, function handleLog(log, idx) {
    if (log.date === date) {
      index = idx
      return false
    }
  })
  if (index !== -1) {
    logs[index].logs.push(finalValue)
    if (logs[index].logs.length > MAX_LOG_COUNTS) {
      logs[index].logs.shift()
    }
  } else {
    logs.push({
      date: date,
      logs: [finalValue],
    })
  }

  try {
    wx.setStorageSync(this.name, logs)
  } catch (e) {
    if (length > 1) {
      logs.slice(0, -1)
      try {
        wx.setStorageSync(this.name, logs)
      } catch (e) {}
    }
  }
}

LogManager.prototype.get = function get() {
  try {
    const value = wx.getStorageSync(this.name)
    return value
  } catch (e) {}
}

// 弹出第一条记录
LogManager.prototype.popleft = function popleft() {
  const logs = this.get()
  let result = []

  if (Array.isArray(logs) && logs.length) {
    [, ...result] = logs
  }

  return result
}


/** Axios类 */

/**
 * Axios构造函数
 *
 * @param {Object} instanceConfig 实例化时传入的配置对象
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager(),
  }
}

/**
 * 主请求函数
 * wx.reqeust\wx.uploadFile\wx.downloadFile 请求都通过该函数进行转发
 *
 * @param {Object} config 每条请求独立的配置对象
 */
Axios.prototype.request = function request(config) {
  if (!config) {
    throw Error(nonConfigError)
  }

  // 兼容不同的创建请求方法
  if (typeof config === 'string') {
    // axios(url[,config])
    config = arguments[1] || {}
    config['url'] = arguments[0]
  } else {
    // axios({...config})
    config = config || {}
  }

  // 将实例化时的配置与调用时的配置进行合并
  config = helpers.mergeConfig(this.defaults, config)

  // 设置请求方法
  if (config.method) {
    config.method = config.method.toUpperCase()
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toUpperCase()
  } else {
    config.method = DEFAULT_METHOD
  }
  if (!methods.includes(config.method)) {
    config.method = DEFAULT_METHOD
  }

  // 获取请求拦截器列表
  const requestInterceptors = []
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    requestInterceptors.unshift(interceptor.fulfilled, interceptor.rejected)
  })

  // 获取响应拦截器列表
  const responseInterceptors = []
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptors.push(interceptor.fulfilled, interceptor.rejected)
  })

  let newConfig = Object.assign(config)

  // 循环处理请求拦截
  while (requestInterceptors.length) {
    const onFulfilled = requestInterceptors.shift()
    const onRejected = requestInterceptors.shift()

    try {
      newConfig = onFulfilled(newConfig)
    } catch(err) {
      onRejected(err)
      break
    }
  }

  let promise

  // 开始派发请求
  try {
    promise = dispatchRequest(newConfig)
  } catch(err) {
    return Promise.reject(err)
  }

  // 循环处理响应拦截
  while (responseInterceptors.length) {
    promise = promise.then(responseInterceptors.shift(), responseInterceptors.shift())
  }

  return promise
}

utils.each(methods, function axiosRequestMethod(method) {
  method = method.toLowerCase()
  const noDataMethod = ['delete', 'get', 'head', 'options']
  Axios.prototype[method] = function(url, data, config) {
    if (utils.isPlainObject(url) && !config) {
      config = url
      url = config.url || ''
    }
    if (utils.isPlainObject(data) && !config) {
      config = data
    }
    return this.request(helpers.mergeConfig(config || {}, {
      url: url,
      method: method,
      data: noDataMethod
              ? (config || {}).data
              : data || (config || {}).data
    }))
  }
})

/**
 * wx.uploadFile 请求别名
 *
 * @param {*} url 请求地址
 * @param {*} config 配置对象
 *
 * @example
 *
 * axios.uploadFile('www.abc.com', 'filePath', 'name', {...config})
 * axios.uploadFile({ url: 'www.abc.com', filePath: 'filePath', name: 'name', ...config })
 */
Axios.prototype.uploadFile = function(url, filePath, name, config) {
  // 兼容参数类型
  const args = arrProto.slice.call(arguments)
  let index = -1
  utils.each(args, function iterateeArgs(arg, idx) {
    if (utils.isPlainObject(arg)) {
      index = idx
      return false
    }
  })
  // 判断前3个参数中是否有对象类型
  // 有的话就赋值给config，然后进行值交换
  if (index > -1 && index < 3) {
    if (index === 0) {
      config = url
      url = config.url || ''
      filePath = config.filePath || ''
      name = config.name || ''
    } else if (index === 1) {
      config = filePath
      filePath = config.filePath || ''
      name = config.name || ''
    } else if (index === 2) {
      config = name
      name = config.name || ''
    }
  }

  filePath = filePath || (config || {}).filePath
  name = name || (config || {}).name
  if (!filePath || !name) {
    throw Error(`[${name}] wx.uploadFile 需要传入 name filePath 属性！`)
  }

  return this.request(helpers.mergeConfig(config || {}, {
    method: 'POST',
    url: url || (config || {}).url,
    filePath: filePath,
    name: name
  }))
}

/**
 * wx.downloadFile 请求别名
 *
 * @param {*} url 请求地址
 * @param {*} config 配置对象
 *
 * @example
 *
 * axios.downloadFile('www.abc.com', {...config})
 * axios.downloadFile({ url: 'www.abc.com', ...config })
 */
Axios.prototype.downloadFile = function(url, config) {
  // 兼容参数类型
  if (utils.isPlainObject(url) && !config) {
    config = url
    url = config.url || ''
  }

  return this.request(helpers.mergeConfig(config || {}, {
    method: 'GET',
    url: url,
    filePath: ((config || {}).filePath) || ''
  }))
}

/**
 * wx.connectSocket 请求别名
 *
 * @param {*} url 请求地址
 * @param {*} config 配置对象
 *
 * @example
 *
 * axios.connectSocket('www.abc.com', {...config})
 * axios.connectSocket({ url: 'www.abc.com', ...config })
 */
Axios.prototype.connectSocket = function(url, config) {
  // 兼容参数类型
  if (utils.isPlainObject(url) && !config) {
    config = url
    url = config.url || ''
  }

  return this.request(helpers.mergeConfig(config || {}, {
    url: url,
    protocols: ((config || {}).protocols) || ''
  }))
}

/**
 * 派发请求
 *
 * @param {Object} config 配置对象
 * @returns {Promise} 返回经过适配器处理后的请求Promise结果
 */
function dispatchRequest(config) {
  if (!config) {
    throw Error(nonConfigError)
  }

  // 在请求拦截器流程处理完成后再次处理data、header参数

  // 处理data参数
  config.data = config.data || {}

  // 合并header参数
  config.header = utils.merge(
    config.header.common || {},
    config.header[config.method] || {},
    config.header || {}
  )
  // 去掉多余的header参数
  utils.each(methods, function deleteHeaderMethod(method) {
    delete config.header[method]
  })
  delete config.header.common

  let adapter = config.adapter(config)
  config.adapterName = adapter.adapterName
  return adapter.adapter(config).then(function onAdapterResolve(response) {
    // 如果配置了forcedJSONParsing，响应data为JSON字符串时自动解析
    if (config.validateStatus(response.statusCode) && config.forcedJSONParsing) {
      const rawData = response.data
      if (utils.isString(rawData)) {
        try {
          response.data = JSON.parse(rawData)
        } catch (err) {
          if (err.name === 'SyntaxError') {
            throw Error(`[${name}] 数据解析失败，出现了语法错误！`)
          }
        }
      }
    }

    // 如果配置了printFulfilledRequest，整个请求完成控制台打印出请求信息
    if (config.openLocalPrinter) {
      config.printManager.printRequest(config, response)
    }

    // 本地日志
    if (config.openLocalLogger) {
      try {
        config.logManager.set(config, response)
      } catch (err) {}
    }

    return response
  }, function onAdapterReject(err) {
    return Promise.reject(err)
  })
}

/**
 * 代理ProxyAxios类
 * 用于管理Axios类单例
 * 单例模式下，传递给Axios的配置仅在第一次传入时生效
 */
const ProxyAxios = (function proxyAxios() {
  let instance = null
  return function singletonAxios(defaultConfig) {
    if (!instance) {
      instance = new Axios(defaultConfig)
    }
    return instance
  }
})()


/** Axios实例 */

/**
 * 实例化Axios
 *
 * @param {Object} defaultConfig 
 * @returns {Object} instance
 */
function createInstance(defaultConfig) {
  if (!defaultConfig) {
    throw Error(nonConfigError)
  }

  const useSingleton = defaultConfig.useSingleton
  let instance = new (useSingleton ? ProxyAxios : Axios)(defaultConfig)

  if (!instance.create) {
    // Axios实例化语法糖
    instance.create = function create(instanceConfig) {
      instanceConfig.useSingleton = false
      return createInstance(helpers.mergeConfig(defaultConfig, instanceConfig))
    }
  }

  return instance
}

let axios = createInstance(defaults)

/**
 * Promise.all 并行执行一系列异步操作，返回结果集
 *
 * @param {Array[Promise]} promises
 * @returns Array[Promise] 结果集
 */
axios.all = function all(promises) {
  return Promise.all(promises)
}

/**
 * Promise.race 哪个结果获得的快，就返回那个结果
 *
 * @param {Array[Promise]} promises
 * @returns Promise 最快获得的那个结果
 */
axios.race = function race(promises) {
  return Promise.race(promises)
}

// 暴露Axios类，提供类继承等功能
axios.Axios = Axios

module.exports = axios