BUPT Network Monitor
===================
![BUPT Network Monitor](./icon.png "BUPT Network Monitor")
#### 主要功能
<ul>
    <li>获取本机ip地址信息</li>
    <li>获取账号流量信息</li>
    <li>获取账号终端登录情况，并提供离线快捷操作</li>
    <li>进行流量账号流量控制，提供总流量超量自动断网、单小时流量超量自动断网</li>
</ul>

#### 使用环境
较新的chrome浏览器

#### 使用方法
<ol>
    <li>打开chrome扩展程序界面，选中右上角的开发者模式</li>
    <li>拖动整个文件夹至此界面，可以看到插件加载成功</li>
    <li>点击浏览器工具栏的本插件图标，在其中填写相关信息，并点击save</li>
    <li>若要登出终端，点击相应终端后面的log off</li>
    <li>点击login gateway本机将登录网关</li>
</ol>

#### 相关信息域介绍
<ul>
    <li> Student ID: 学号</li>
    <li> Password: 校园网网关密码，此处默认自助服务密码与些密码一致</li>
    <li> Gateway: 校园网网关，此处只测试通过[http://10.3.8.211/](http://10.3.8.211/)，其它网关暂未测试</li>
    <li> Hour Max: 小时最大流量域值，在对应的复选框打开的情况下，此功能开启，如果小时流量超过此域值，自动离线所有终端</li>
    <li> Auto Logoff Threshold: 自动离线域值，在对应复选框打开的情况下，此功能开启，如果总流量超过此域值，将离线所有终端</li>
    <li> 注意：以上所有数据设置后，需要点击save后才会生效</li>
</ul>

#### License
MIT
