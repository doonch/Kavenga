#!/usr/bin/env python3
"""
Executes `.agents/skills/island-redesign/scripts/audit_island_layout.mjs` in macOS
JavaScriptCore (`jsc -m`) by resolving bare `'three'` imports against `vendor/three.module.min.js`.
Usage: python3 .agents/skills/island-redesign/scripts/run_audit.py <island_id|--all>
"""

import os
import shutil
import subprocess
import sys
import tempfile

JSC_BIN = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc"

def main():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
    audit_src = os.path.join(os.path.dirname(__file__), "audit_island_layout.mjs")
    args = sys.argv[1:] or ["raiatea"]

    with tempfile.TemporaryDirectory(prefix="kavenga_audit_") as tmp:
        for sub in ["src/rendering", "src/core", "src/data", "src/simulation"]:
            src_dir = os.path.join(repo_root, sub)
            dst_dir = os.path.join(tmp, sub)
            os.makedirs(dst_dir, exist_ok=True)
            for fn in os.listdir(src_dir):
                if not fn.endswith(".js"):
                    continue
                txt = open(os.path.join(src_dir, fn)).read()
                txt = txt.replace("from 'three';", "from '../../vendor/three.module.min.js';")
                open(os.path.join(dst_dir, fn), "w").write(txt)

        vendor_dst = os.path.join(tmp, "vendor")
        os.makedirs(vendor_dst, exist_ok=True)
        shutil.copy(os.path.join(repo_root, "vendor/three.module.min.js"), os.path.join(vendor_dst, "three.module.min.js"))

        audit_txt = open(audit_src).read().replace("from 'three';", "from './vendor/three.module.min.js';")
        audit_dst = os.path.join(tmp, "audit_island_layout.mjs")
        open(audit_dst, "w").write(audit_txt)

        cmd = [JSC_BIN, "-m", audit_dst, "--", *args]
        res = subprocess.run(cmd, cwd=tmp)
        sys.exit(res.returncode)

if __name__ == "__main__":
    main()
