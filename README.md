# scrapyJsCtrl
a dynamic ajax  call for scrapyd;一个在前台 用js及时 获取 scrapy 爬取的结果的接口,就是 js与scrapyd交互,通过不断查询任务状态,当job已经finished,就返回结果

基本上常用的就是
newSchedule() 了


这个就是 因为后台起了 scrapyd 服务器后 要用前台 和他交互的嘛，
那么 如果 所爬取的数据 很少 并且需要及时(爬虫处理完就尽快返回给前台)处理，
那么 就可以 像接口中写的那样
首先 发起一个请求 开始一个爬取任务，并返回给 前台他的jobid
然后每隔 2s 去scrapyd 上查询一下 job状态 ，finished 后就去取spider处理过的数据，
就好了呀，调用示例：
 $scope.scrapy = function (){
                        //test1 
                       // scrapyService.daemonstatus();
                       //test2: 发出简单请求 开启任务 ///延时 默认时间 后 取数据
                       var param = {
                            "project":"ArticleSpider",
                            "spider":'yml'
                       }
                       scrapyService.newSchedule(param,
                            function(r){
                                console.log(r)
                            },
                        null,{});
                    }

我直接把写在公司项目里的代码拿出来了，主要就是把scrapyd 的API用js翻译了一下，
又封装了一个时时查询 接口。。
