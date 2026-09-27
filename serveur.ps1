# Stormbound : petit serveur local, sans rien installer (PowerShell de Windows).
# Lance par lancer.bat. Ferme la fenetre pour arreter le serveur.
$port = 8000
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try { $listener.Start() } catch {
  Write-Host "Le port $port est deja utilise. Ferme l'autre fenetre du serveur, puis relance." -ForegroundColor Red
  Read-Host "Appuie sur Entree pour fermer"
  exit 1
}
Write-Host ""
Write-Host "  Stormbound tourne sur : http://localhost:$port/" -ForegroundColor Cyan
Write-Host "  Ferme cette fenetre pour arreter la machine."
Write-Host ""
Start-Process "http://localhost:$port/"
$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.webp' = 'image/webp'; '.png' = 'image/png'
  '.md' = 'text/plain; charset=utf-8'; '.json' = 'application/json'
}
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
  if ($rel -eq '') { $rel = 'index.html' }
  $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
  if ($full.StartsWith($root) -and (Test-Path -LiteralPath $full -PathType Leaf)) {
    $bytes = [System.IO.File]::ReadAllBytes($full)
    $ext = [System.IO.Path]::GetExtension($full).ToLower()
    if ($types.ContainsKey($ext)) { $ctx.Response.ContentType = $types[$ext] } else { $ctx.Response.ContentType = 'application/octet-stream' }
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}
