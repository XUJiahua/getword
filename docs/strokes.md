这是 [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) 的标准格式,数据来自 [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) 项目。"您"字共 11 笔,所以三个数组里都是 11 个元素一一对应。

## 三个顶层字段

**`strokes`** — 每一笔的**轮廓**(SVG path),不是中线
每个字符串是一段封闭的 SVG 路径,描述笔画的填充形状(包括起笔、运笔粗细变化、收笔的钩/捺等)。可以直接塞进 `<path d="...">` 渲染。命令包括 `M`(moveto)、`Q`(二次贝塞尔)、`L`(lineto)、`Z`(闭合)。

**`medians`** — 每一笔的**中心线轨迹**(离散采样点)
每个元素是 `[[x1,y1], [x2,y2], ...]` 形式的折线,表示这一笔从起点到终点中轴线的走向。这是做笔顺动画的关键:hanzi-writer 用它来计算笔画的"长度"和"前进进度",再配合 `stroke-dasharray` / `stroke-dashoffset` 让 stroke 轮廓一段一段揭开。也可以用来做笔顺校对(用户写的轨迹 vs. 标准 medians 做 DTW/Frechet 距离)。

**`radStrokes`** — 部首所占的笔画索引(0-based)
"您"= 你 + 心,部首是"心"。`[7, 8, 9, 10]` 对应最后四笔(点、卧钩、点、点),正好是"心"字底。用来高亮显示部首。

## 坐标系(最容易踩的坑)

- 画布是 **1024 × 1024**
- **Y 轴向上**(数学坐标系),不是 SVG 默认的向下
- 实际字形被放在大约 `y ∈ [-124, 900]` 的范围里(留了下边距给"基线下"的笔画)

所以渲染时必须做 Y 翻转,典型变换:

```html
<svg viewBox="0 0 1024 1024">
  <g transform="scale(1, -1) translate(0, -900)">
    <path d="..." fill="#333" />  <!-- 来自 strokes -->
  </g>
</svg>
```

如果直接画不做翻转,你会得到一个上下颠倒的字。

## medians 的对照检查

把第 0 笔的 median 拿出来看:

```
[[335, 807], [355, 784], [362, 757], [328, 693], [219, 549], [143, 472], [113, 450]]
```

这是"您"左上"亻"的撇——从右上 (335, 807) 起笔,一路向左下行进到 (113, 450) 收笔。配合上面 Y 轴向上的约定,808 在上面、450 在下面,符合"撇是从右上到左下"的笔势。这就是 medians 的意义:它是写这一笔的方向和路径,而 strokes 只告诉你这一笔填充后长什么样。

## 一个最小可用渲染

```js
const data = await fetch('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/您.json').then(r => r.json());

// 静态字形
const svg = `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <g transform="scale(1, -1) translate(0, -900)">
    ${data.strokes.map((d, i) => 
      `<path d="${d}" fill="${data.radStrokes.includes(i) ? '#c00' : '#333'}"/>`
    ).join('')}
  </g>
</svg>`;
```

这样部首"心"会被标红。
