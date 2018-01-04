/**
 * @service:爬虫服务集群
 * Created by Lixd
 */
define(['app'], function (app) {
    app.registerFactory('scrapyService', ["$q","$http", "$rootScope", "dataService","vpUtilService", 
        function ($q,$http, $rootScope, dataService,vpUtilService) {

            /*
            *爬虫服务:获取 爬虫服务器 运行状态
            * response : { "status": "ok", "running": "0", "pending": "0", "finished": "0", "node_name": "node-name" }
            */
            function daemonstatus(){
                $.ajax({
                    url: "http://localhost:6800/daemonstatus.json",//
                    type:"GET",
                    success: function(response){
                        console.log(response)
                    },
                    error: function(err){
                        console.log(err)
                    },
                });
            }

            /*
            *爬虫服务:向活跃 爬虫 发送执行任务 
            * prams:    
            *       param spider 执行参数 
            *       exp:{project :活跃的项目,spider: 执行的spider,username:lixd,password:123456}
            *            project 与spider为必填 且名称固定，其余为具体spreader 执行参数 依spider而定
            *       callback 成功回调
            8       tempData 内部 回调私用
            *
            * response : {"status": "ok", "jobid": "6487ec79947edab326d6db28a2d86511e8247444"}
            */
            function schedule(param,callback,failure,tempData){
                if(!param || !param.project || !param.spider){
                    return daemonstatus();
                }

                $.ajax({
                    url: "http://localhost:6800/schedule.json",//
                    type:"POST",
                    data:param,
                    success: function(response){
                        console.log(response)
                        if(callback)callback(response,param,tempData);
                    },
                    error: function(err){
                        console.log(err)
                        if(failure)failure(err);
                    },
                });
            }

            /*
            *爬虫服务:取消 或说删除 任务 
            * prams:    
            *       project 活跃爬虫
            *       jobid 取消任务id
            *
            * response : {"status": "ok", "prevstate": "running"}
            */
            function cancel(project,jobid,callback,failure){
                if(!project || !_jobid){
                    return daemonstatus();
                }

                $.ajax({
                    url: "http://localhost:6800/cancel.json",//
                    type:"POST",
                    data:{
                        "project":project,
                        "job":jobid
                    },
                    success: function(response){
                        console.log(response)
                        if(callback)callback(response);
                    },
                    error: function(err){
                        console.log(err)
                        if(failure)failure(err);
                    },
                });
            }



            /*
            *爬虫服务:获取 所有 任务队列 
            * prams:    
            *       project 活跃爬虫
            *
            * response : {"node_name": "ACA80190.ipt.aol.com","running": [],"finished": 
                            [{"end_time": "2018-01-04 09:48:51.390873","id": "6873acf6f0f111e7bb58f40f24303080","spider": "yml","start_time": "2018-01-04 09:48:48.848462"}]
                        ,"status": "ok","pending": []
            */
            function listjobs(project,callback,failure){
                if(!project){
                    return daemonstatus();
                }

                $.ajax({
                    url: "http://localhost:6800/listjobs.json",//
                    type:"GET",
                    data:{
                        "project":project
                    },
                    success: function(response){
                        console.log(response)
                        if(callback)callback(response);
                    },
                    error: function(err){
                        console.log(err)
                        if(failure)failure(err);
                    },
                });
            }


            /*
            * utils: 查找 某一任务是否完成
            * param:
            *       project 爬虫
            *       jobid 查询状态的任务id
            *       callbackOut 因为 是异步的 所有逻辑都要放在 回调中所以 。。。
            *       tempData 内部调用
            * return:
            *       false 未finished 没有在finsihed 队列找到
            *       true 已完成
            */
            function checkJobStatus (project,jobid,callbackOut,tempData){
                //回调处理函数 response 由 中间件 传递
                function callbackIn(response,tempData){
                    var result = response;//JSON.parse(response);
                    var finished = vpUtilService.defaultSort(result.finished,"id");
                    // "project" + "id"
                    var status = vpUtilService.findItemInEleArrayComplex(finished,"id",tempData.jobId);
                    return (status == -1)?false:true//
                }
                // 有TM点复杂呀～ 简单说 就是callbackOut 是 自定义的 外部回调处理，
                // 这里的callbackIn 是一个 对 response返回值的处理，并将结果返回给 out
                listjobs(project,function(response){callbackOut(response,callbackIn(response,tempData),tempData)});
            }

            /*
            * 接口: 根据传入参数决定 是否需要 在 一定时间内返回 爬取结果
            * param:
            *       limit null 则只是开启爬虫,不需要时时返回,否则在规定时限内 努力返回 查询结果 还可定制 是否超出时限 取消任务 ,间隔查询时间
            *       jobid 查询状态的任务id
            * return:
            *       false 未finished 没有在finsihed 队列找到
            *       true 已完成
            */
            function newSchedule (param,callbackSource,failure,limit){
                if(!limit){
                    //不需要时时返回
                    schedule (param,callbackSource,failure);
                }
                // 若想使用默认参数 tempLimit 请至少传递 {}
                // 但不要传递 数字或字符串等 类型 并可根据 需求 自动填补 参数
                var tempLimit ={"limitTime":5,"timeStep":2000,"autoCancel":true,"Time":0}
                for(var atr in limit){
                    tempLimit[atr] = limit[atr];
                }
                if(!param || !param.project || !param.spider){
                    return daemonstatus();
                }

                /*
                *思路 : 要先启动一个任务 并将 其返回的 jobid 握住
                *       依据 间隔 不断查询 ，当查出结果 返回
                */
                var loopCallback = function(response,param,tempData){
                    // if(init){
                    //     //初次 查询 也要有些设置 延迟啊 是否 已经Timeout 等等
                    // }
                    var callbackOut = function (response,status,tempData){
                        if(status){
                            callbackSource(response);
                        }else if(++tempData.tempLimit.Time < tempData.tempLimit.limitTime){
                            setTimeout(
                                function(){
                                    checkJobStatus(tempData.project,tempData.jobid,callbackOut,tempData)
                                },tempData.tempLimit.timeStep)
                        }else{
                            //failure
                        }
                    }
                    tempData.project = param.project;
                    setTimeout(
                        function(){
                            checkJobStatus(tempData.project,tempData.jobid,callbackOut,tempData)
                        },tempData.tempLimit.timeStep)
                }

                // 这里的三个参数都是 由schedule调用时传入的，这里不方便传入
                var catchJobIdCallback = function(response,param,tempData){
                    tempData.jobId = response.jobid;
                    loopCallback(response,param,tempData);
                }
                schedule (param,catchJobIdCallback,failure,{"tempLimit":tempLimit,"callbackSource":callbackSource});
            }


            return {
                daemonstatus:daemonstatus,//获取 爬虫服务器 运行状态
                schedule:schedule,//向活跃 爬虫 发送执行任务
                cancel:cancel,//取消 或说删除 任务 
                listjobs:listjobs,//获取 所有 任务队列 
                checkJobStatus: checkJobStatus,//查找 某一任务是否完成
                newSchedule:newSchedule//接口 自主判断 需不需要 及时返回
            }
        }
    ]);
})
