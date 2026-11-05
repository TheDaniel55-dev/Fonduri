/* CHANGELOG.md is the source shown to readers and maintained by contributors. */
(() => {
  const expanded = new Set();
  let publishedText;
  class ChangeLog extends HTMLElement {
    async connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({mode:'open'});
      this.shadowRoot.textContent = 'Se încarcă istoricul…';
      try {
        const embedded = document.getElementById('dsl-release-source');
        if (!embedded && !publishedText) {
          publishedText = fetch('CHANGELOG.md').then(response => {
            if (!response.ok) throw Error('Fișier indisponibil');
            return response.text();
          }).catch(error => { publishedText = null; throw error; });
        }
        const source = embedded ? embedded.content.textContent : await publishedText;
        this.show(source);
      } catch (_) {
        this.shadowRoot.textContent = 'Istoricul nu este disponibil. ';
        const retry = document.createElement('button');
        retry.textContent = 'Reîncearcă';
        retry.onclick = () => this.connectedCallback();
        this.shadowRoot.append(retry);
      }
    }
    show(source) {
      const body = document.createDocumentFragment();
      const style = document.createElement('style');
      style.textContent = ':host{display:block}h3{font-size:1em;margin:1.15em 0 .4em}details{border-bottom:1px solid var(--line,#ffffff21)}summary{cursor:pointer;padding:.65em 0;font-weight:600;line-height:1.45}summary::marker{font-size:.8em}p{line-height:1.55;margin:0 0 .8em;padding-left:1em}';
      body.append(style);
      let version, article, entryCount = 0;
      for (const raw of source.split(/\r?\n/)) {
        const line = raw.trim();
        if (line.startsWith('## ')) {
          version = line.slice(3); article = null;
          const heading = document.createElement('h3'); heading.textContent = version; body.append(heading);
        } else if (version && line.startsWith('### ')) {
          const title = line.slice(4), key = version + '/' + title;
          article = document.createElement('details'); article.open = expanded.has(key);
          const summary = document.createElement('summary'); summary.textContent = title; article.append(summary);
          article.addEventListener('toggle', event => { if(event.currentTarget.open) expanded.add(key); else expanded.delete(key); });
          body.append(article); entryCount++;
        } else if (line && article) {
          const p = document.createElement('p'); p.textContent = line; article.append(p);
        }
      }
      if (!entryCount) throw Error('Istoric gol');
      this.shadowRoot.replaceChildren(body);
    }
  }
  customElements.define('dsl-change-log', ChangeLog);
})();
