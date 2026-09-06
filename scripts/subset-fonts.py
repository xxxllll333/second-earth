# -*- coding: utf-8 -*-
"""
字体子集化脚本 —— 去 AI 味第一步的基建
把系统里的「阿里巴巴普惠体 65 Medium」(8MB) 裁剪成只含本站实际用字的 woff2，
并把「Good Times」转成 woff2。产物输出到 public/fonts/，供 @font-face 引用。

用法（文案有增改后重跑一次即可）：
    cd second-earth
    py scripts/subset-fonts.py
"""
import os
import glob
import string
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options

# ── 路径 ───────────────────────────────────────────────
PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # second-earth/
SRC = os.path.join(PROJ, 'src')
OUT = os.path.join(PROJ, 'public', 'fonts')
FONT_DIR = r'C:\Users\25081\AppData\Local\Microsoft\Windows\Fonts'
ALIBABA = os.path.join(FONT_DIR, 'AlibabaPuHuiTi-3-65-Medium.ttf')
GOODTIMES = os.path.join(FONT_DIR, 'goodtimesrg-regular.ttf')


def collect_chars():
    """扫描全站源码，收集用到的每一个字符（含中文），作为子集依据。"""
    chars = set()
    files = []
    for ext in ('ts', 'tsx', 'css', 'json', 'html'):
        files += glob.glob(os.path.join(SRC, '**', '*.' + ext), recursive=True)
    files.append(os.path.join(PROJ, 'index.html'))
    for f in files:
        try:
            with open(f, encoding='utf-8') as fh:
                chars.update(fh.read())
        except Exception as e:
            print('  跳过', os.path.basename(f), e)
    # 安全兜底：ASCII 可见字符 + 常见中文标点/序号，防止遗漏导致个别字退回系统字体
    chars.update(string.printable)
    chars.update('，。、；：？！“”‘’（）《》〈〉【】〔〕…—～·￥％＋－×÷°①②③④⑤⑥⑦⑧⑨⑩')
    # 去掉换行/制表等控制字符，仅保留空格
    return ''.join(sorted(c for c in chars if (c.strip() or c == ' '))), len(files)


def to_woff2_subset(src, dst, text):
    """按给定字符集裁剪字体并输出 woff2。"""
    font = TTFont(src)
    opts = Options()
    opts.ignore_missing_glyphs = True
    opts.ignore_missing_unicodes = True
    ss = Subsetter(options=opts)
    ss.populate(text=text)
    ss.subset(font)
    font.flavor = 'woff2'
    font.save(dst)
    return os.path.getsize(dst)


def to_woff2_full(src, dst):
    """整份转 woff2（用于本身很小的英文字体）。"""
    font = TTFont(src)
    font.flavor = 'woff2'
    font.save(dst)
    return os.path.getsize(dst)


def main():
    charset, nfiles = collect_chars()
    print('扫描文件数: %d | 唯一字符数: %d' % (nfiles, len(charset)))
    os.makedirs(OUT, exist_ok=True)

    a_out = os.path.join(OUT, 'alibaba-puhuiti-65-medium.woff2')
    a_kb = to_woff2_subset(ALIBABA, a_out, charset) / 1024
    print('阿里普惠体 65 Medium 子集 woff2: %.1f KB  (原 8.04 MB)' % a_kb)

    g_out = os.path.join(OUT, 'good-times.woff2')
    g_kb = to_woff2_full(GOODTIMES, g_out) / 1024
    print('Good Times Regular woff2: %.1f KB  (原 0.07 MB)' % g_kb)

    print('输出目录:', OUT)


if __name__ == '__main__':
    main()
