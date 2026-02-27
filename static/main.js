(function(){
  const form = document.getElementById('upload-form');
  const filesInput = document.getElementById('files');
  const dropArea = document.getElementById('drop-area');
  const fileItems = document.getElementById('file-items');
  const progress = document.getElementById('progress');
  const progressBar = document.getElementById('progress-bar');
  const submitBtn = document.getElementById('submit-btn');

  // internal list of selected files (allows removal)
  let currentFiles = [];

  function preventDefaults(e){ e.preventDefault(); e.stopPropagation(); }
  ['dragenter','dragover','dragleave','drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false)
  });

  dropArea.addEventListener('drop', handleDrop, false);
  filesInput.addEventListener('change', handleFileSelect);
  function handleDrop(e){
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);
    currentFiles = files;
    syncInputFiles();
    updateFileList();
  }

  function handleFileSelect(e){
    currentFiles = Array.from(filesInput.files);
    updateFileList();
  }

  function syncInputFiles(){
    const dt = new DataTransfer();
    currentFiles.forEach(f=>dt.items.add(f));
    filesInput.files = dt.files;
  }

  function makeFileItem(file, idx){
    const container = document.createElement('div');
    container.className = 'file-item';

    const title = document.createElement('div');
    title.className = 'file-title';
    title.textContent = file.name + ' (' + Math.round(file.size/1024) + ' KB)';

    const preview = document.createElement('div');
    preview.className = 'file-preview';
    preview.textContent = 'Preview loading...';

    const pbarWrap = document.createElement('div');
    pbarWrap.className = 'file-progress';
    const pbar = document.createElement('div');
    pbar.className = 'file-progress-bar';
    pbar.style.width = '0%';
    pbarWrap.appendChild(pbar);

    container.appendChild(title);
    container.appendChild(preview);
    container.appendChild(pbarWrap);

    // Try to read file and show a small preview
    const reader = new FileReader();
    reader.onload = function(ev){
      const text = ev.target.result;
      // try to find first table
      try{
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const table = doc.querySelector('table');
        if (table){
          // show only first row or two for compactness
          const clone = table.cloneNode(true);
          // remove tbody rows after 2
          const trs = clone.querySelectorAll('tr');
          for (let i=2;i<trs.length;i++) trs[i].remove();
          preview.innerHTML = '';
          preview.appendChild(clone);
          return;
        }
      }catch(e){}
      // fallback: show text snippet
      preview.textContent = text.slice(0, 300) + (text.length>300? '...':'');
    };
    reader.readAsText(file);

    return {container, pbar};
  }

  function updateFileList(){
    const files = currentFiles;
    fileItems.innerHTML = '';
    const summary = document.getElementById('file-summary');
    summary.innerHTML = '';
    if (!files || files.length === 0) return;
    const ul = document.createElement('ul');
    files.forEach((file, idx)=>{
      const li = document.createElement('li');
      li.textContent = file.name + ' ';
      const btn = document.createElement('button');
      btn.textContent = '[remove]';
      btn.type = 'button';
      btn.addEventListener('click', ()=>{
        currentFiles.splice(idx,1);
        syncInputFiles();
        updateFileList();
      });
      li.appendChild(btn);
      ul.appendChild(li);
      const fi = makeFileItem(file, idx);
      fileItems.appendChild(fi.container);
    });
    summary.appendChild(ul);
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    const files = currentFiles;
    if (!files || files.length === 0){
      alert('Select at least one HTML file.');
      return;
    }

    const formData = new FormData();
    for (let i=0;i<files.length;i++){
      formData.append('files', files[i]);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/convert', true);
    xhr.responseType = 'blob';

    // map per-file progress by total bytes
    const totalBytes = Array.from(files).reduce((s,f)=>s+f.size,0);
    const fileElements = Array.from(document.querySelectorAll('.file-item'));
    const fileBars = fileElements.map(el=>el.querySelector('.file-progress-bar'));

    xhr.upload.addEventListener('progress', function(e){
      if (!e.lengthComputable) return;
      const loaded = e.loaded;
      // overall percent
      const percent = (loaded / e.total) * 100;
      progress.style.display = 'block';
      progressBar.style.width = percent + '%';

      // per-file progress estimation
      let rem = loaded;
      for (let i=0;i<files.length;i++){
        const size = files[i].size;
        let p = 0;
        if (rem >= size){ p = 1; rem -= size; }
        else { p = Math.max(0, rem / size); rem = 0; }
        if (fileBars[i]) fileBars[i].style.width = Math.round(p*100) + '%';
      }
    });

    xhr.onloadstart = function(){
      submitBtn.disabled = true;
      progress.style.display = 'block';
      progressBar.style.width = '0%';
      // reset per-file bars
      fileElements.forEach((el)=>{
        const b = el.querySelector('.file-progress-bar'); if (b) b.style.width='0%';
      });
    };

    xhr.onerror = function(){
      alert('Upload failed.');
      submitBtn.disabled = false;
      progress.style.display = 'none';
    };

    xhr.onload = function(){
      submitBtn.disabled = false;
      if (xhr.status === 200){
        const disposition = xhr.getResponseHeader('Content-Disposition') || '';
        let filename = 'converted.xlsx';
        const m = /filename=\"?([^\";]+)\"?/.exec(disposition);
        if (m && m[1]) filename = m[1];

        const blob = xhr.response;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        progress.style.display = 'none';
        progressBar.style.width = '0%';
        // mark all files complete
        fileElements.forEach((el)=>{
          const b = el.querySelector('.file-progress-bar'); if (b) b.style.width='100%';
        });
      } else {
        const reader = new FileReader();
        reader.onload = function(){
          alert('Server error: ' + reader.result);
        };
        reader.readAsText(xhr.response);
        progress.style.display = 'none';
      }
    };

    xhr.send(formData);
  });
})();
