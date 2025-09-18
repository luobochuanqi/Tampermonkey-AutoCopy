// ==UserScript==
// @name         题目与选项复制工具（右侧按钮版）
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  在页面右侧添加复制按钮，点击后复制题目和选项到剪贴板
// @author       ChatECNU
// @match        https://js.zhixinst.com/exam/exam*
// @grant        GM_setClipboard
// @grant        GM_notification
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 配置选项
    const config = {
        questionContainerSelector: '.question-main', // 题目容器选择器
        questionTitleSelector: '.question-title div', // 题目文本选择器
        optionsContainerSelector: '.question-options', // 选项容器选择器
        optionItemSelector: '.options-list', // 单个选项选择器
        optionLetterSelector: '.options-raido', // 选项字母选择器
        notificationTimeout: 2000 // 通知显示时间(毫秒)
    };

    // 添加自定义样式
    GM_addStyle(`
        #tm-copy-button {
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            z-index: 9999;
            padding: 12px 16px;
            background-color: #4caf50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        }
        
        #tm-copy-button:hover {
            background-color: #45a049;
            transform: translateY(-50%) scale(1.05);
        }
        
        #tm-copy-button:active {
            transform: translateY(-50%) scale(0.95);
        }
        
        #tm-copy-message {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: #4caf50;
            color: white;
            border-radius: 4px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transition: opacity 0.3s;
        }
    `);

    // 主函数 - 初始化脚本
    function init() {
        // 等待页面加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createCopyButton);
        } else {
            createCopyButton();
        }
    }

    // 创建复制按钮
    function createCopyButton() {
        // 移除可能已存在的按钮
        const existingButton = document.getElementById('tm-copy-button');
        if (existingButton) {
            existingButton.remove();
        }

        // 创建新按钮
        const copyButton = document.createElement('button');
        copyButton.id = 'tm-copy-button';
        copyButton.textContent = '复制题目';
        copyButton.addEventListener('click', handleCopyButtonClick);

        // 添加到页面
        document.body.appendChild(copyButton);
        
        console.log('复制按钮已添加到页面右侧');
    }

    // 处理复制按钮点击事件
    function handleCopyButtonClick() {
        console.log('复制按钮被点击，开始提取内容...');
        extractAndCopyContent();
    }

    // 提取题目和选项内容并复制到剪贴板
    function extractAndCopyContent() {
        try {
            // 提取题目
            const titleElement = document.querySelector(config.questionTitleSelector);
            if (!titleElement) {
                throw new Error('未找到题目元素');
            }
            const questionText = titleElement.textContent.trim();

            // 提取选项
            const options = [];
            const optionElements = document.querySelectorAll(config.optionItemSelector);

            if (optionElements.length === 0) {
                throw new Error('未找到选项元素');
            }

            optionElements.forEach(option => {
                const letterElement = option.querySelector(config.optionLetterSelector);
                const letter = letterElement ? letterElement.textContent.trim() : '';
                // 获取选项文本（去除字母部分）
                const text = option.textContent.replace(letter, '').trim();
                options.push({ letter, text });
            });

            // 格式化内容
            const formattedContent = formatContent(questionText, options);

            // 复制到剪贴板
            GM_setClipboard(formattedContent, 'text');

            // 显示成功通知
            showNotification('复制成功', '题目和选项已复制到剪贴板', 'success');

            console.log('已复制内容:\n', formattedContent);
        } catch (error) {
            console.error('提取内容失败:', error.message);
            showNotification('错误', `提取失败: ${error.message}`, 'error');
        }
    }

    // 格式化题目和选项内容
    function formatContent(question, options) {
        let formattedText = `题目: ${question}\n\n选项:\n`;

        options.forEach(option => {
            formattedText += `${option.letter}. ${option.text}\n`;
        });

        return formattedText;
    }

    // 显示通知
    function showNotification(title, text, type) {
        // 尝试使用GM_notification API
        if (typeof GM_notification !== 'undefined') {
            GM_notification({
                title: title,
                text: text,
                timeout: config.notificationTimeout,
                highlight: type === 'success'
            });
        } else {
            // 降级方案：使用浏览器原生通知
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, { body: text });
            } else if ('Notification' in window && Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification(title, { body: text });
                    }
                });
            }

            // 最终降级：在控制台显示消息
            console.log(`${title}: ${text}`);
        }

        // 同时在页面上显示一个简单的提示
        const existingMessage = document.getElementById('tm-copy-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const message = document.createElement('div');
        message.id = 'tm-copy-message';
        message.textContent = text;
        message.style.backgroundColor = type === 'success' ? '#4caf50' : '#f44336';

        document.body.appendChild(message);

        // 3秒后自动消失
        setTimeout(() => {
            if (message.parentNode) {
                message.style.opacity = '0';
                setTimeout(() => message.remove(), 300);
            }
        }, config.notificationTimeout);
    }

    // 启动脚本
    init();
})();
