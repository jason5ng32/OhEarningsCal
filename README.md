# 财报日历

使用 Finnhub API 获取财报日历数据，然后生成 ics 文件，并导入到日历中使用，用来提前准备是否需要关注某个股票的财报。

## 使用方法

### 安装依赖

```bash
npm install
```

### 设置环境变量

创建 `.env` 文件，填入 `FINNHUB_API_KEY`，`FINNHUB_API_KEY` 可以在 [Finnhub](https://finnhub.io/) 注册获取。

需要注意的是，免费的 API Key 有每分钟 60 次的限制，同时，获取财报日历的范围最大是 14 天（似乎有时候有 bug，会变成 7 天）。

### 创建 ics 目录

```bash
mkdir ics
```

### 运行

```bash
npm start
```

或者通过 pm2 运行

```bash
pm2 start server.js --name=earnings-calendar
```

### 启动 Nginx 代理

略。

程序会定时每天 9 点获取财报日历数据，然后生成 ics 文件，保存在 ./ics 目录下。目前更新的日历是 `selected.ics` 。

## 导入日历

通过 Nginx 代理后，在日历软件中导入 `https://example.com/ics/selected.ics` 即可。

## 修改股票列表

修改 `./api/customstock.json` 文件，按照格式添加需要关注的股票代码。

## 测试文件生成

将 `genics.js` 中的下面这行代码反注释：

```javascript
// generateEarningsICSCalendar();
```

然后在根目录运行：

```bash
node ./api/genics.js
```

测试成功后，再注释掉这行代码。重新运行程序即可。

## 备注

因为考虑到已经发布的财报，网上已经都有，所有日历数据没有做缓存，每天都会生成从 7 天前到未来 23 天（一共 30 天）的财报日历。
