export const encodedAnglePlaceholderSource = `flowchart LR
    subgraph inputs["Pinned inputs"]
        envlock["mica-build-env lock"]
        baselock["mica-system-base lock"]
        upstream["Kernel, U-Boot, firmware,<br/>and source pins"]
        trust["Public boot and verity<br/>trust certificates"]
    end

    subgraph registry["Board registry"]
        rows["boards/boards.tsv"]
        x64["x64<br/>amd64 / systemd-boot"]
        virt["virt-arm64<br/>arm64 / systemd-boot"]
        cx["cx3576<br/>arm64 / U-Boot FIT"]
        s905["s905x5m<br/>arm64 / U-Boot FIT"]
        rows --> x64
        rows --> virt
        rows --> cx
        rows --> s905
    end

    subgraph boardbuild["Per-board build contract"]
        definition["board.env + outputs.tsv"]
        kernel["Kernel config, patches,<br/>device tree, modules"]
        loader["systemd-boot or U-Boot"]
        support["Firmware and support payload"]
        boardpkg["mica-board-&lt;board&gt;"]
        radio["Wi-Fi and Bluetooth packages"]
        evidence["Evidence and board tests"]
    end

    inputs --> boardbuild
    registry --> definition
    definition --> kernel
    definition --> loader
    definition --> support
    definition --> boardpkg
    definition --> radio
    kernel --> evidence
    loader --> evidence
    support --> evidence
    boardpkg --> evidence

    evidence --> gate["Board contract + package gate"]
    gate --> pool["Per-board OCI Debian pool"]
    gate --> bundle["Board bundle<br/>kernel, loader, firmware, metadata"]
    pool --> lock["mica-boards.lock + SHA256SUMS"]
    bundle --> lock
    lock --> consumer["mica-build product assembly"]
`
