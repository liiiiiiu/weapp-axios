# Weapp Axios

**Weapp Axios 参考了 Axios，用于微信小程序发起网络请求。**

[Axios 官方文档](http://www.axios-js.com/zh-cn/docs/#axios)

## 发起 wx.request 请求（默认为GET请求）

```javascript
axios('/user/12345')

axios({ method: 'post', url: '/user/12345', data: { firstName: 'Fred' } })
```

### 使用别名

```javascript
axios.request(config)

axios.get(url[, data[, config]])

axios.delete(url[, data[, config]])

axios.head(url[, data[, config]])

axios.options(url[, data[, config]])

axios.post(url[, data[, config]])

axios.put(url[, data[, config]])

axios.patch(url[, data[, config]])
```

## 发起 wx.uploadFile 请求

```javascript
// 传入 name 以及 filePath 参数会自动发起 wx.uploadFile 请求
axios({ url: 'www.abc.com', name: 'name', filePath: 'filePath' })
```

### 使用别名

```javascript
axios.uploadFile('www.abc.com', 'filePath', 'name', {...config})

axios.uploadFile({ url: 'www.abc.com', filePath: 'filePath', name: 'name', ...config })
```

## 发起 wx.downloadFile 请求

```javascript
// 传入 filePath 参数会自动发起 wx.downloadFile 请求（wx.downloadFile中的 filePath 为非必填项，可传入空值）
axios({ url: 'www.abc.com', filePath: '' })
```

### 使用别名

```javascript
axios.downloadFile('www.abc.com', 'filePath', 'name', {...config})

axios.downloadFile({ url: 'www.abc.com', filePath: 'filePath', name: 'name', ...config })
```

## 发起 wx.connectSocket 请求

```javascript
axios.connectSocket('www.abc.com', {...config})

axios.connectSocket({ url: 'www.abc.com', ...config })
```

## 处理 Task 任务对象

wx.request\wx.uploadFile\wx.downloadFile\wx.connectSocket 拥有相同的处理方法。

在 config 内传入包含 Axios 官方文档内合法Task方法的 task 对象。

```javascript
axios.downloadFile({
  url: 'www.abc.com',
  task: {
    // task对象键值命名必须与官方文档Task提供的函数名一致
    onProgressUpdate: (res, task) => {
      // 使用自定义函数接收参数
      yourOnProgressUpdateFun(res, task)
    },
    offProgressUpdate: (res, task) => {
      yourOffProgressUpdateFunc(res, task)
    },
    // 如果不是on监听事件的回调函数，axios传入的是task对象
    abort: task => {
      yourAbortFunc(task)
    },
  },
});

function yourAbortFunc(task) {
  if (true) {
    task.abort()
  }
}
```

## 新增特性

非 `release` 环境支持**本地打印**以及**本地日志**记录。
