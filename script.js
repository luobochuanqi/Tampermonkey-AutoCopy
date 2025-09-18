// ==UserScript==
// @name         题目与选项自动复制工具
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  自动识别页面题目和选项，点击下一题后复制到剪贴板
// @author       ChatECNU
// @match        https://js.zhixinst.com/exam/exam*
// @grant        GM_setClipboard
// @grant        GM_notification
// ==/UserScript==

(function() {
    'use strict';

    // 配置选项
    const config = {
        nextButtonSelector: '.btn.next-btn', // 下一题按钮选择器
        questionContainerSelector: '.question-main', // 题目容器选择器
        questionTitleSelector: '.question-title div', // 题目文本选择器
        optionsContainerSelector: '.question-options', // 选项容器选择器
        optionItemSelector: '.options-list', // 单个选项选择器
        optionLetterSelector: '.options-raido', // 选项字母选择器
        observerTimeout: 3000, // 观察超时时间(毫秒)
        notificationTimeout: 2000 // 通知显示时间(毫秒)
    };

    // 主函数 - 初始化脚本
    function init() {
        // 等待页面加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupButtonListener);
        } else {
            setupButtonListener();
        }
    }

    // 设置下一题按钮监听器
    function setupButtonListener() {
        const nextButton = document.querySelector(config.nextButtonSelector);

        if (!nextButton) {
            console.log('未找到下一题按钮，将在1秒后重试...');
            setTimeout(setupButtonListener, 1000);
            return;
        }

        // 移除可能已存在的事件监听器（避免重复绑定）
        nextButton.removeEventListener('click', handleNextButtonClick);
        // 添加点击事件监听，使用 {capture: true} 确保在默认行为前触发
        nextButton.addEventListener('click', handleNextButtonClick, {capture: true});

        console.log('已成功监听下一题按钮');
    }

    // 处理下一题按钮点击事件
    function handleNextButtonClick(event) {
        console.log('检测到下一题按钮点击，等待新题目加载...');

        // 设置观察器来检测题目区域的变化
        const questionContainer = document.querySelector(config.questionContainerSelector);

        if (!questionContainer) {
            console.error('未找到题目容器');
            showNotification('错误', '未找到题目区域', 'error');
            return;
        }

        // 创建MutationObserver来检测DOM变化
        const observer = new MutationObserver(function(mutations) {
            // 当检测到变化时，尝试提取题目和选项
            observer.disconnect(); // 停止观察

            // 添加短暂延迟确保内容完全加载
            setTimeout(() => {
                extractAndCopyContent();
            }, 300);
        });

        // 配置并启动观察器
        observer.observe(questionContainer, {
            childList: true,
            subtree: true,
            characterData: true
        });

        // 设置超时，防止观察器永远不触发
        setTimeout(() => {
            observer.disconnect();
            extractAndCopyContent();
        }, config.observerTimeout);
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
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#4caf50' : '#f44336'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transition: opacity 0.3s;
        `;

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
