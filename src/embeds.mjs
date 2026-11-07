// Builds the two self-updating HTML blocks for the tracker page from status.json.
// Each block renders today's numbers as static markup, then re-renders from the live
// status.json in the browser. Output: build/bars.html and build/changes.html.
// Paste each into its beehiiv `embed` node (see README).
import fs from "node:fs";

const STATUS_URL = "https://raw.githubusercontent.com/AuthorsWisdom/x-algorithm-status/main/status.json";
const s = JSON.parse(fs.readFileSync("status.json", "utf8"));

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Libre+Baskerville:wght@700&display=swap" rel="stylesheet">`;

// Shared, runs in node for the fallback and in the browser after fetch.
const renderBars = `function renderBars(s){
  var max=function(a){return Math.max.apply(null,a.map(function(x){return Math.abs(x.value)}))};
  var col=function(title,items,color){
    var m=max(items)||1;
    return '<div class="col"><h2>'+title+'</h2>'+items.map(function(x){
      var w=Math.max(1,Math.round(Math.abs(x.value)/m*100));
      return '<p class="lbl">'+x.label+'&nbsp;&nbsp;'+x.value+'</p><div class="bar" style="width:'+w+'%;background:'+color+'"></div>';
    }).join('')+'</div>';
  };
  return col('What helps',s.helps,'#16A34A')+col('What hurts',s.hurts,'#DC2626')+
    '<p class="note">Weights score predicted actions, not raw counts. A report does not cancel a set number of likes.</p>';
}`;
const renderChanges = `function renderChanges(s){
  return '<p class="kick">Since '+s.since+'</p><h2>What changed</h2><div class="grid">'+s.recent.map(function(x){
    return '<div class="card"><p class="arrow" style="color:'+(x.up?'#16A34A':'#DC2626')+'">'+(x.up?'\u2191':'\u2193')+'</p><p class="name">'+x.label+'</p><p class="vals">'+x.from+' to '+x.to+'</p></div>';
  }).join('')+'</div>';
}`;

const CSS_BARS = `<style>
*{box-sizing:border-box}body{margin:0;background:transparent;font-family:Inter,system-ui,sans-serif;color:#969BA6}
#xa-bars{display:grid;grid-template-columns:1fr 1fr;gap:28px 64px;text-align:left}
.col{min-width:0}h2{margin:0 0 4px;font-family:"Libre Baskerville",Georgia,serif;font-weight:700;font-size:28px;line-height:120%;color:#E6EDF3}
.lbl{margin:0;font-size:16px;font-weight:700;line-height:120%;padding:4px 0 2px}
.bar{height:14px;border-radius:7px;margin:0 0 12px}
.note{grid-column:1/-1;margin:0;padding-top:12px;font-size:20px;font-weight:700;line-height:120%}
@media(max-width:640px){#xa-bars{grid-template-columns:1fr;gap:28px}}
</style>`;
const CSS_CHANGES = `<style>
*{box-sizing:border-box}body{margin:0;background:transparent;font-family:Inter,system-ui,sans-serif;color:#969BA6}
#xa-changes{text-align:left}.kick{margin:0 0 6px;font-size:12px;font-weight:600;line-height:120%;color:#279FC9}
h2{margin:0 0 28px;font-family:"Libre Baskerville",Georgia,serif;font-weight:700;font-size:28px;line-height:120%;color:#E6EDF3}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}.card p{margin:0 0 4px;line-height:120%}
.arrow{font-family:"Libre Baskerville",Georgia,serif;font-weight:700;font-size:40px}.name{font-size:20px;font-weight:700}.vals{font-size:15px;font-weight:400}
@media(max-width:640px){.grid{grid-template-columns:1fr 1fr}}
</style>`;

const loader = (id, fn) => `<script>
${fn === "renderBars" ? renderBars : renderChanges}
(function(){var el=document.getElementById('${id}');
fetch('${STATUS_URL}',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(s){if(s&&s.helps&&s.recent)el.innerHTML=${fn}(s);}).catch(function(){});})();
</script>`;

// Node-side fallback markup, same functions.
const bars = new Function("s", renderBars + "; return renderBars(s);")(s);
const changes = new Function("s", renderChanges + "; return renderChanges(s);")(s);

fs.mkdirSync("build", { recursive: true });
fs.writeFileSync("build/bars.html", `${FONTS}${CSS_BARS}<div id="xa-bars">${bars}</div>${loader("xa-bars", "renderBars")}`);
fs.writeFileSync("build/changes.html", `${FONTS}${CSS_CHANGES}<div id="xa-changes">${changes}</div>${loader("xa-changes", "renderChanges")}`);
console.log("wrote build/bars.html and build/changes.html");
