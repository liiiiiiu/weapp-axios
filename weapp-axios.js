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
 * axiso.upload('www.abc.com', 'filePath', 'name', {})
 * axiso.upload({ url: 'www.abc.com', filePath: 'filePath', name: 'name' })
 * 
 * 发起 wx.downloadFile 请求
 * 
 * 传入 filePath 参数会自动发起 wx.downloadFile 请求（wx.downloadFile中的 filePath 为非必填项，可传入空值）
 * axios({ url: 'www.abc.com', filePath: '' })
 * 
 * 使用别名
 * axiso.download('www.abc.com', 'filePath', 'name', {})
 * axiso.download({ url: 'www.abc.com', filePath: 'filePath', name: 'name' })
 */

const name = 'Weapp-Axios'
const objProto = Object.prototype
const arrProto = Array.prototype

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
    return value != null && typeof value !== 'function' && objProto.hasOwnProperty.call(value, 'length')
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
   * 验证 HTTP 状态码
   * 
   * @param {Number} statusCode 状态码
   * @returns {Boolean} true or false
   */
  validateStatusCode: function validateStatusCode(statusCode) {
    return statusCode >= 200 && statusCode < 300
  },

  /**
   * 获取value的数据类型
   * 
   * @param {*} value
   * @returns {Strint} '[Object ?]'
   */
  getTag: function(value) {
    if (value == null) {
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
    if (collection == null) {
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
    const config = utils.merge(config1, config2)
    return config
  },

  /**
   * 获得接口认证方式
   * 
   * @param {Object} config 配置对象
   * @returns {String} 返回认证方式
   */
  getAuthorization: function getAuthorization(config) {
    if (!config) return ''

    let authorization = ''

    // 处理 HTTP Basic Auth
    if (config.auth) {
      const username = config.auth.username || ''
      const password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : ''
      authorization = 'Basic ' + username + ':' + password
    }

    // 处理 HTTP Bearer Token
    if (config.token) {
      authorization = 'Bearer ' + config.token
    }

    return authorization
  },

  /**
   * 判断一个地址是否为绝对地址
   * 如果一个地址以"<scheme>://" or "//"开头，则代表它是一个绝对地址
   * 
   * @param {String} url
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
        suffix += ((!isExist && index === 0 ? '' : '&') + (key + '=' + params[key]))
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

    baseURL = baseURL + ''
    url = url + ''
    
    return helpers.isAbsoluteURL(url)
            ? url
            : helpers.combineURLs(baseURL, url) 
  },

  // 打印已完成的请求
  printFulfilledRequest: function printFulfilledRequest(config, response) {
    if (!config) return undefined

    console.log('%c↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓', 'color: #67c23a')
    if (!utils.validateStatusCode(response.statusCode)) {
      console.log(`%cstatusCode：${response.statusCode}`, 'color: #fa5151;font-size:21px;')
    }
    console.log('=> 请求路径：', config.url)
    console.log('=> 请求方式：', config.method)
    if (Object.keys(config.data).length > 0) {
      console.log('=> 请求参数：', config.data || {})
    }
    console.log('=> 响应结果：', response || {})
    console.log('=> 请求时间：', new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString())
    console.log('%c↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑', 'color: #67c23a')
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
 * wx.request请求适配器
 * 
 * @param {Object} config 配置对象
 */
function requestAdapter(config) {
  config = config || {}

  return new Promise(function dispatchWXRequest(resolve, reject) {
    const requestData = config.data || {}
    const requestHeader = config.header || {}

    function onsuccess(res) {
      resolve(res)
    }

    function onfail(err) {
      reject(err)
    }

    function oncomplete() {}

    const request = wx.request

    // 路径、Authorization不同适配器会有部分差异，
    // 不在dispatchRequest函数中进行处理

    // 构建完整路径
    if (config.params && config.url) {
      config.url = helpers.buildPathParam(config.url, config.params)
    }
    const fullPath = helpers.buildFullPath(config.baseURL, config.url)

    // 进行接口认证
    if (config.auth || config.token) {
      requestHeader.Authorization = helpers.getAuthorization(config)
    }

    // 发起请求
    request({
      url: fullPath,
      data: requestData.data,
      dataType: config.dataType,
      header: requestHeader,
      method: config.method,
      responseType: config.responseType,
      timeout: config.timeout,
      enableCache: config.enableCache,
      enableHttp2: config.enableHttp2,
      enableQuic: config.enableQuic,
      success: res => { onsuccess && onsuccess(res) },
      fail: res => { onfail && onfail(res) },
      complete: () => { oncomplete && oncomplete() },
    })
  })
}

/**
 * wx.uploadFile 请求适配器
 * 
 * @param {Object} config 配置对象
 */
function uploadFileAdapter(config) {
  config = config || {}

  return new Promise(function dispatchWXUploadFile(resolve, reject) {
    const requestHeader = config.header || {}

    function onsuccess(res) {
      resolve(res)
    }

    function onfail(err) {
      reject(err)
    }

    function oncomplete() {}

    const request = wx.uploadFile

    // 构建完整路径
    if (config.params && config.url) {
      config.url = helpers.buildPathParam(config.url, config.params)
    }
    const fullPath = helpers.buildFullPath(config.baseURL, config.url)

    // 进行接口认证
    if (config.auth || config.token) {
      requestHeader.Authorization = helpers.getAuthorization(config)
    }
    
    // wx.uploadFile 的 content-type 必须为 multipart/form-data
    requestHeader['content-type'] = 'multipart/form-data'

    if (!config.name || !config.filePath) {
      throw Error(`[${name}] wx.uploadFile 需要传入 name filePath 属性！`)
    }

    // 发起请求
    request({
      method: 'POST',
      url: fullPath,
      name: config.name,
      filePath: config.filePath,
      header: requestHeader,
      timeout: config.timeout,
      success: res => { onsuccess && onsuccess(res) },
      fail: res => { onfail && onfail(res) },
      complete: () => { oncomplete && oncomplete() },
    })
  })
}

/**
 * wx.downloadFile 请求适配器
 * 
 * @param {Object} config 配置对象
 */
function downloadFileAdapter(config) {
  config = config || {}

  return new Promise(function dispatchWXDownloadFile(resolve, reject) {
    const requestHeader = config.header || {}

    function onsuccess(res) {
      resolve(res)
    }

    function onfail(err) {
      reject(err)
    }

    function oncomplete() {}

    const request = wx.downloadFile

    // 构建完整路径
    if (config.params && config.url) {
      config.url = helpers.buildPathParam(config.url, config.params)
    }
    const fullPath = helpers.buildFullPath(config.baseURL, config.url)

    // 进行接口认证
    if (config.auth || config.token) {
      requestHeader.Authorization = helpers.getAuthorization(config)
    }

    // 发起请求
    request({
      method: 'GET',
      url: fullPath,
      filePath: config.filePath,
      header: requestHeader,
      timeout: config.timeout,
      success: res => { onsuccess && onsuccess(res) },
      fail: res => { onfail && onfail(res) },
      complete: () => { oncomplete && oncomplete() },
    })
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
  // 使用 wx.uploadFile\wx.downloadFile\wx.request 特有的参数字段进行判断
  // 如果config有name及filePath属性，则认为当前使用了 wx.uploadFile 接口
  // 如果config只有filePath属性，则认为当前使用了 wx.downloadFile 接口
  // 如果config没有name及filePath属性，则认为当前使用了 wx.request 接口
  if (config.name && config.filePath) {
    adapter = uploadFileAdapter
    adapterName = 'wx.uploadFile'
  } else if (!config.name && objProto.hasOwnProperty.call(config, 'filePath')) {
    adapter = downloadFileAdapter
    adapterName = 'wx.downloadFile'
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

  // 打印已完成的请求
  printFulfilledRequest: true,

  // 本地日志记录
  localLog: true,
  logManager: new LogManager(),

  // 返回的数据格式
  dataType: 'json',
  
  // 响应的数据类型 text/arraybuffer
  responseType: 'text',

  // 开启 http2	
  enableHttp2: false,

  // 开启 quic
  enableQuic: false,

  // 开启 cache
  enableCache: false,

  // 是否开启 HttpDNS 服务。如开启，需要同时填入 httpDNSServiceId
  // HttpDNS 用法详见 https://developers.weixin.qq.com/miniprogram/dev/framework/ability/HTTPDNS.html
  enableHttpDNS: false,

  // HttpDNS 服务商 Id
  httpDNSServiceId: false,

  // 开启 transfer-encoding chunked
  enableChunked: false,
}

// 根据请求方法设置默认header
utils.each(methods, function setMethodHeader(method){
  defaults.header[method] = DEFAULT_HEADER
})


/** 本地日志缓存 */

function LogManager() {
  this.name = name || 'Weapp-Axios'
}

LogManager.prototype.set = function set(config, response) {
  if (!config) return undefined

  let logs = this.get() || []
  if (logs.length > 6) {
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
    if (logs[index].logs.length > 300) {
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
    promise.then(responseInterceptors.shift(), responseInterceptors.shift())
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
 * axiso.upload('www.abc.com', 'filePath', 'name', {})
 * axiso.upload({ url: 'www.abc.com', filePath: 'filePath', name: 'name' })
 */
Axios.prototype.upload = function(url, filePath, name, config) {
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

  return this.request(config || {}, {
    method: 'POST',
    url: url || (config || {}).url,
    filePath: filePath,
    name: name
  })
}

/**
 * wx.downloadFile 请求别名
 * 
 * @param {*} url 请求地址
 * @param {*} config 配置对象
 * 
 * @example
 * 
 * axiso.download('www.abc.com')
 * axiso.download({ url: 'www.abc.com' })
 */
Axios.prototype.download = function(url, config) {
  // 兼容参数类型
  if (utils.isPlainObject(url) && !config) {
    config = url
    url = config.url || ''
  }

  return this.request(config || {}, {
    method: 'GET',
    url: url,
    filePath: ((config || {}).filePath) || ''
  })
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
  console.log('adapter', adapter, config)
  return adapter.adapter(config).then(function onAdapterResolve(response) {
    // 如果配置了forcedJSONParsing，响应data为JSON字符串时自动解析
    if (utils.validateStatusCode(response.statusCode) && config.forcedJSONParsing) {
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
    if (config.printFulfilledRequest) {
      helpers.printFulfilledRequest(config, response)
    }

    // 本地日志记录
    if (config.localLog) {
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
      return createInstance(helpers.mergeConfig(defaultConfig, instanceConfig))
    }
  }

  return instance
}

// 测试代码

let axios = createInstance(defaults)
let axios1 = createInstance(defaults)
let axios2 = axios.create({
  useSingleton: false,
  baseURL: 'https://api.wmdb.tv/api/v1/',
  auth: {

  },
  token: '',
})
console.log('axios', axios2, axios === axios1, axios === axios2)

axios2.interceptors.request.use(function (config) {
  // 在发送请求之前做些什么
  console.log('请求被拦截了111')
  return config;
}, function (error) {
  // 对请求错误做些什么
  return Promise.reject(error);
})

axios2.interceptors.response.use(function (response) {
  // 对响应数据做点什么
  console.log('响应被拦截了222')
  return response;
}, function (error) {
  // 对响应错误做点什么
  return Promise.reject(error);
})

// axios2.request({
//   useSingleton: false,
//   params: {
//     type: 'Imdb',
//     skip: 1,
//     limit: 10,
//     lang: 'Cn',
//     page: 2
//   },
//   url: '/top',
//   baseURL: 'https://api.wmdb.tv/api/v1/',
//   token: '',
//   data: {},
//   method: 'get'
// }).then((res) => {
//   console.log('request请求1', res)
// })

// axios2.post('/top', {
//   'a': 1,
//   'b': 2,
// }, {
//   useSingleton: false,
//   params: {
//     type: 'Imdb',
//     skip: 1,
//     limit: 10,
//     lang: 'Cn',
//     page: 2
//   },
//   baseURL: 'https://api.wmdb.tv/api/v1/',
//   token: '',
//   method: 'get',
//   data: {
//     a: 1,
//     b: 2,
//   },
//   filePath: '',
// }).then((res) => {
//   console.log('request请求2', res)
// })

axios2.download({ url: '/top', params: {
  type: 'Imdb',
  skip: 1,
  limit: 10,
  lang: 'Cn',
  page: 2
}})

// axios2.upload({ url: '/top', params: {
//   type: 'Imdb',
//   skip: 1,
//   limit: 10,
//   lang: 'Cn',
//   page: 2
// }, name:'111', filePath: '222'})


// 暴露Axios类，提供类继承等功能
axios.Axios = Axios

module.exports = axios