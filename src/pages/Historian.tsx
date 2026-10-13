// Phase one: same-origin document isolation; no data bridge or migration.
const historianUrl = new URL('personal-historian/index.html', document.baseURI).href

export default function Historian() {
  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">自我历史学</h1>
          <p className="mt-1 text-sm text-muted">记录事实、保留修订，用长期证据理解自己。</p>
        </div>
        <a href={historianUrl} target="_blank" rel="noopener noreferrer" className="btn text-sm">独立窗口打开 ↗</a>
      </header>
      <p className="text-xs text-muted">
        记录保存在本机浏览器，与 RPG 日志分别保存。同域旧入口的档案可继续使用；其他域名的档案请先导出 JSON。
      </p>
      <iframe src={historianUrl} title="自我历史学研究工作区"
        className="w-full h-[75dvh] min-h-[520px] rounded-xl border border-line bg-white" />
    </section>
  )
}
