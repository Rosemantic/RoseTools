#!/usr/bin/env node
/**
 * 数据同步脚本
 * 将 sites.json 的数据同步到 sites-data.js
 * 使用方法: node sync-data.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE_FILE = 'sites.json';
const TARGET_FILE = 'sites-data.js';

const syncData = () => {
  try {
    console.log('开始同步数据...');
    
    // 读取 sites.json
    const jsonData = fs.readFileSync(SOURCE_FILE, 'utf8');
    const parsedData = JSON.parse(jsonData);
    
    // 验证数据格式
    if (!parsedData.categories || !parsedData.sites) {
      throw new Error('数据格式错误：缺少 categories 或 sites 字段');
    }
    
    // 生成 sites-data.js 内容
    const now = new Date().toLocaleString('zh-CN', { 
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const jsContent = `// 网站数据 - 由 sites.json 同步生成
// 最后更新: ${now}

const SITES_DATA = ${JSON.stringify(parsedData, null, 2)};
`;
    
    // 写入 sites-data.js
    fs.writeFileSync(TARGET_FILE, jsContent, 'utf8');
    
    console.log(`✓ 同步成功！`);
    console.log(`  源文件: ${SOURCE_FILE}`);
    console.log(`  目标文件: ${TARGET_FILE}`);
    console.log(`  网站数量: ${parsedData.sites.length}`);
    console.log(`  分类数量: ${parsedData.categories.length}`);
    console.log(`  更新时间: ${now}`);
    
  } catch (error) {
    console.error('✗ 同步失败:', error.message);
    process.exit(1);
  }
};

// 执行同步
syncData();


