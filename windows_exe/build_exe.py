#!/usr/bin/env python3
"""
Builds the self-contained 64-bit Windows executable (VitalMonitor_Cardiogram.exe)
with the entire compiled React/Vite application embedded inside the .exe binary.
Layout of VitalMonitor_Cardiogram.exe:
  - Bytes 0..2047     : Native 64-bit Windows PE GUI executable (sets $env:VTL_EXE)
  - Bytes 2048..4095  : Embedded PowerShell local loopback HTTP server script (127.0.0.1:18765)
  - Bytes 4096..EOF   : GZIP-compressed self-contained single-file HTML/CSS/JS bundle (~225 KB)
"""

import os
import re
import glob
import gzip
import struct


def main():
    with open("dist/index.html", "r", encoding="utf-8") as f:
        html = f.read()

    css_content = ""
    for cf in sorted(glob.glob("dist/assets/*.css")):
        with open(cf, "r", encoding="utf-8") as f:
            css_content += f.read() + "\n"

    js_content = ""
    for jf in sorted(glob.glob("dist/assets/*.js")):
        with open(jf, "r", encoding="utf-8") as f:
            js_content += f.read() + "\n"

    js_safe = js_content.replace("</script>", "<\\/script>")

    html_inlined = re.sub(
        r'<link[^>]+rel="stylesheet"[^>]*>',
        lambda _: f"<style>{css_content}</style>",
        html,
    )
    html_inlined = re.sub(
        r'<script[^>]+src="/assets/[^"]+"[^>]*></script>',
        lambda _: f'<script type="module">{js_safe}</script>',
        html_inlined,
    )

    gz_payload = gzip.compress(html_inlined.encode("utf-8"), compresslevel=9)
    print(f"Inlined HTML: {len(html_inlined)} bytes | GZIP payload: {len(gz_payload)} bytes")

    # Single-line PowerShell script stored at byte offset 2048..4095 of the .exe
    ps_script_line = (
        '$u="http://127.0.0.1:18765/";'
        'try{'
        '$fs=[IO.File]::OpenRead($env:VTL_EXE);'
        '$fs.Position=4096;'
        '$gz=[IO.Compression.GZipStream]::new($fs,[IO.Compression.CompressionMode]::Decompress);'
        '$ms=[IO.MemoryStream]::new();'
        '$gz.CopyTo($ms);'
        '$b=$ms.ToArray();'
        '$gz.Close();$fs.Close();'
        '$l=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,18765);'
        '$l.Start()'
        '}catch{'
        'Start-Process cmd.exe -ArgumentList "/c start `"`" msedge --app=$u --window-size=1440,920 || start `"`" chrome --app=$u --window-size=1440,920 || start `"`" $u" -WindowStyle Hidden;'
        'exit'
        '};'
        'Start-Process cmd.exe -ArgumentList "/c start `"`" msedge --app=$u --window-size=1440,920 || start `"`" chrome --app=$u --window-size=1440,920 || start `"`" $u" -WindowStyle Hidden;'
        '$h=[Text.Encoding]::ASCII.GetBytes("HTTP/1.1 200 OK`r`nContent-Type: text/html; charset=utf-8`r`nContent-Length: $($b.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n");'
        '$h204=[Text.Encoding]::ASCII.GetBytes("HTTP/1.1 204 No Content`r`nConnection: close`r`n`r`n");'
        'while($true){try{'
        '$c=$l.AcceptTcpClient();'
        '$s=$c.GetStream();'
        '$buf=New-Object byte[] 2048;'
        '$n=$s.Read($buf,0,$buf.Length);'
        '$req=[Text.Encoding]::ASCII.GetString($buf,0,$n);'
        'if($req.StartsWith("GET /favicon")){$s.Write($h204,0,$h204.Length)}'
        'else{$s.Write($h,0,$h.Length);$s.Write($b,0,$b.Length)};'
        '$s.Flush();$c.Close()'
        '}catch{}}'
    )

    ps_block = bytearray(2048)
    ps_bytes = (ps_script_line + "\r\n").encode("utf-8")
    assert len(ps_bytes) < 2048, f"PS script too long: {len(ps_bytes)}"
    ps_block[0:len(ps_bytes)] = ps_bytes

    bootstrap_cmd = (
        'powershell.exe -NoProfile -WindowStyle Hidden -Command '
        '"$f=[IO.File]::OpenRead($env:VTL_EXE);$f.Position=2048;iex ([IO.StreamReader]::new($f)).ReadLine()"'
    )
    print(f"Bootstrap command length: {len(bootstrap_cmd)} bytes")

    def build_pe64_exe(cmd_str: str, extra_payload: bytes = b"") -> bytes:
        dos_header = bytearray(0x80)
        dos_header[0:2] = b"MZ"
        struct.pack_into("<I", dos_header, 0x3C, 0x80)

        pe_sig = b"PE\x00\x00"
        coff_header = struct.pack(
            "<HHIIIHH",
            0x8664, 2, 0x672A8000, 0, 0, 0xF0, 0x0022
        )

        opt_header = bytearray(0xF0)
        struct.pack_into("<H", opt_header, 0, 0x020B)
        opt_header[2] = 14
        struct.pack_into("<I", opt_header, 4, 0x200)
        struct.pack_into("<I", opt_header, 8, 0x400)
        struct.pack_into("<I", opt_header, 16, 0x1000)
        struct.pack_into("<I", opt_header, 20, 0x1000)
        struct.pack_into("<Q", opt_header, 24, 0x140000000)
        struct.pack_into("<I", opt_header, 32, 0x1000)
        struct.pack_into("<I", opt_header, 36, 0x0200)
        struct.pack_into("<H", opt_header, 40, 6)
        struct.pack_into("<H", opt_header, 48, 6)
        struct.pack_into("<I", opt_header, 56, 0x3000)
        struct.pack_into("<I", opt_header, 60, 0x0200)
        struct.pack_into("<H", opt_header, 68, 2)  # WINDOWS_GUI (no console window flash)
        struct.pack_into("<H", opt_header, 70, 0x0000)
        struct.pack_into("<Q", opt_header, 72, 0x100000)
        struct.pack_into("<Q", opt_header, 80, 0x1000)
        struct.pack_into("<Q", opt_header, 88, 0x100000)
        struct.pack_into("<Q", opt_header, 96, 0x1000)
        struct.pack_into("<I", opt_header, 108, 16)

        # Dir 1: Import Table at 0x2000 (size 0x28)
        struct.pack_into("<II", opt_header, 120, 0x2000, 0x28)
        # Dir 12: IAT at 0x2058 (size 0x28)
        struct.pack_into("<II", opt_header, 208, 0x2058, 0x28)

        sec_text = struct.pack(
            "<8sIIIIIIHHI",
            b".text\x00\x00\x00", 0x200, 0x1000, 0x200, 0x200, 0, 0, 0, 0, 0x60000020
        )
        sec_rdata = struct.pack(
            "<8sIIIIIIHHI",
            b".rdata\x00\x00", 0x400, 0x2000, 0x400, 0x400, 0, 0, 0, 0, 0xC0000040
        )

        headers = bytearray(0x200)
        raw_hdr = dos_header + pe_sig + coff_header + opt_header + sec_text + sec_rdata
        headers[0:len(raw_hdr)] = raw_hdr

        code = bytearray()

        def emit(b: bytes):
            code.extend(b)

        def emit_rip_rel(prefix: bytes, target_rva: int):
            next_rip = 0x1000 + len(code) + len(prefix) + 4
            disp = target_rva - next_rip
            code.extend(prefix + struct.pack("<i", disp))

        emit(b"\x48\x83\xEC\x28")                 # sub rsp, 0x28
        emit(b"\x31\xC9")                         # xor ecx, ecx
        emit_rip_rel(b"\x48\x8D\x15", 0x2200)     # lea rdx, [rip+disp] -> path_buf (0x2200)
        emit(b"\x41\xB8\xD0\x01\x00\x00")         # mov r8d, 464
        emit_rip_rel(b"\xFF\x15", 0x2058)         # call [GetModuleFileNameA]

        emit_rip_rel(b"\x48\x8D\x0D", 0x20E0)     # lea rcx, [rip+disp] -> "VTL_EXE"
        emit_rip_rel(b"\x48\x8D\x15", 0x2200)     # lea rdx, [rip+disp] -> path_buf (0x2200)
        emit_rip_rel(b"\xFF\x15", 0x2060)         # call [SetEnvironmentVariableA]

        emit_rip_rel(b"\x48\x8D\x0D", 0x2100)     # lea rcx, [rip+disp] -> cmd_str (0x2100)
        emit(b"\x31\xD2")                         # xor edx, edx (SW_HIDE=0)
        emit_rip_rel(b"\xFF\x15", 0x2068)         # call [WinExec]

        emit(b"\x31\xC9")                         # xor ecx, ecx
        emit_rip_rel(b"\xFF\x15", 0x2070)         # call [ExitProcess]
        emit(b"\xC3")                             # ret

        text_sec = bytearray(0x200)
        text_sec[0:len(code)] = code

        # .rdata section: 0x400 (1024 bytes), so headers(512) + .text(512) + .rdata(1024) = 2048 bytes!
        rdata_sec = bytearray(0x400)
        struct.pack_into("<IIIII", rdata_sec, 0x00, 0x2030, 0, 0, 0x2080, 0x2058)
        struct.pack_into("<QQQQQ", rdata_sec, 0x30, 0x2090, 0x20A6, 0x20C0, 0x20CA, 0)
        struct.pack_into("<QQQQQ", rdata_sec, 0x58, 0x2090, 0x20A6, 0x20C0, 0x20CA, 0)
        rdata_sec[0x80:0x8D] = b"KERNEL32.dll\x00"
        rdata_sec[0x90:0xA5] = b"\x00\x00GetModuleFileNameA\x00"
        rdata_sec[0xA6:0xC0] = b"\x00\x00SetEnvironmentVariableA\x00"
        rdata_sec[0xC0:0xCA] = b"\x00\x00WinExec\x00"
        rdata_sec[0xCA:0xD8] = b"\x00\x00ExitProcess\x00"
        rdata_sec[0xE0:0xE8] = b"VTL_EXE\x00"

        cmd_bytes = cmd_str.encode("ascii") + b"\x00"
        assert len(cmd_bytes) < 256, f"cmd_str exceeds 256 bytes: {len(cmd_bytes)}"
        rdata_sec[0x100:0x100 + len(cmd_bytes)] = cmd_bytes

        pe_image = bytes(headers + text_sec + rdata_sec)
        assert len(pe_image) == 2048
        return pe_image + extra_payload

    exe_standalone = build_pe64_exe(bootstrap_cmd, bytes(ps_block) + gz_payload)
    local_cmd = 'cmd.exe /c start "" msedge --app=http://localhost:3000 --window-size=1440,920 || start "" chrome --app=http://localhost:3000 --window-size=1440,920'
    exe_localhost = build_pe64_exe(local_cmd)

    # Verify offsets in exe_standalone
    assert exe_standalone[2048:2048 + len(ps_script_line)].decode("utf-8") == ps_script_line
    decompressed = gzip.decompress(exe_standalone[4096:])
    assert len(decompressed) == len(html_inlined.encode("utf-8"))

    for folder in ["windows_exe", "public/windows_exe", "dist/windows_exe"]:
        os.makedirs(folder, exist_ok=True)
        with open(f"{folder}/VitalMonitor_Cardiogram.exe", "wb") as f:
            f.write(exe_standalone)
        with open(f"{folder}/VitalMonitor_Localhost.exe", "wb") as f:
            f.write(exe_localhost)
        with open(f"{folder}/VitalMonitor_Standalone.html", "w", encoding="utf-8") as f:
            f.write(html_inlined)

    print(f"Verified & built self-contained VitalMonitor_Cardiogram.exe: {len(exe_standalone)} bytes")


if __name__ == "__main__":
    main()
