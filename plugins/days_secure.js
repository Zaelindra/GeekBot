const axios = require('axios')
const { parseString } = require('xml2js')
const Bot = require('../modules/bot')

class Plugin extends Bot {
  constructor() {
    super()
    this.rssUrls = ['https://www.freebuf.com/feed', 'https://paper.seebug.org/rss/', 'https://blog.nsfocus.net/feed/', 'https://www.4hou.com/feed']
  }

  async fetchRSS(urls) {
    try {
      const itemsArray = []
      const today = new Date().toISOString().split('T')[0] // 今天的日期

      const requests = urls.map(async url => {
        const response = await axios.get(url)
        return { url, response }
      })

      const results = await Promise.all(requests)

      results.forEach(({ url, response }) => {
        if (response.status === 304) {
          console.log(`RSS源 ${url} 未更新`)
          return
        }

        const xml = response.data
        parseString(xml, (err, result) => {
          if (err) {
            console.error(`解析 ${url} 失败:`, err)
            return
          }

          const items = result.rss.channel[0].item
          items.forEach(item => {
            // 通过解析文章中的日期信息，筛选出今天发布的文章
            const pubDate = new Date(item.pubDate[0])
            const pubDateString = pubDate.toISOString().split('T')[0] // 文章发布日期

            // 只选择今天发布的文章加入发送列表
            if (pubDateString === today) {
              const title = item.title[0]
              const link = item.link[0]
              const content = `${title}${link}`
              const jsonData = {
                title: title,
                description: title,
                url: link,
                picurl: 'https://picsum.photos/200',
              }
              itemsArray.push(jsonData)
            }
          })
        })
      })

      return itemsArray
    } catch (error) {
      console.error('获取RSS源失败:', error)
      return [] // 返回空数组表示获取数据失败
    }
  }

  async sendInBatches(articles, batchSize) {
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize)
      await this.sendNews(batch)
    }
  }

  async run() {
    try {
      const articles = await this.fetchRSS(this.rssUrls)
      console.log('获取到的RSS数据:', articles)

      const batchSize = 8 // 每次发送的文章数量
      await this.sendInBatches(articles, batchSize)

      console.log('成功发送到企业微信机器人')
    } catch (error) {
      console.error('运行插件时出现错误:', error)
    }
    console.log('插件执行完毕')
  }
}

new Plugin().run()
