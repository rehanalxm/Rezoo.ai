param(
    [Parameter(Mandatory=$false)][int]$Level = -1,
    [Parameter(Mandatory=$false)][int]$Adjust = 0,
    [Parameter(Mandatory=$false)][switch]$Mute,
    [Parameter(Mandatory=$false)][switch]$Unmute
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int f(); int g(); int h(); int i();
    int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
    int j();
    int GetMasterVolumeLevelScalar(out float pfLevel);
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
    int GetMute(out bool pbMute);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    int Activate(ref System.Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject { }

public class AudioMaster {
    public static void SetVolume(float level) {
        var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
        IMMDevice dev;
        enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
        var IID = typeof(IAudioEndpointVolume).GUID;
        IAudioEndpointVolume epv;
        dev.Activate(ref IID, 23, 0, out epv);
        epv.SetMasterVolumeLevelScalar(level, System.Guid.Empty);
    }
    public static float GetVolume() {
        var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
        IMMDevice dev;
        enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
        var IID = typeof(IAudioEndpointVolume).GUID;
        IAudioEndpointVolume epv;
        dev.Activate(ref IID, 23, 0, out epv);
        float vol = 0;
        epv.GetMasterVolumeLevelScalar(out vol);
        return vol;
    }
    public static void SetMute(bool mute) {
        var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
        IMMDevice dev;
        enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
        var IID = typeof(IAudioEndpointVolume).GUID;
        IAudioEndpointVolume epv;
        dev.Activate(ref IID, 23, 0, out epv);
        epv.SetMute(mute, System.Guid.Empty);
    }
}
"@

if ($Level -ge 0) {
    $scalar = [Math]::Max(0.0, [Math]::Min(1.0, [float]$Level / 100.0))
    [AudioMaster]::SetVolume($scalar)
    Write-Output "Volume set to $Level%"
} elseif ($Adjust -ne 0) {
    $current = [AudioMaster]::GetVolume()
    $new = [Math]::Max(0.0, [Math]::Min(1.0, $current + ([float]$Adjust / 100.0)))
    [AudioMaster]::SetVolume($new)
    $percent = [Math]::Round($new * 100)
    Write-Output "Volume adjusted to $percent%"
} elseif ($Mute) {
    [AudioMaster]::SetMute($true)
    Write-Output "Audio muted"
} elseif ($Unmute) {
    [AudioMaster]::SetMute($false)
    Write-Output "Audio unmuted"
} else {
    $current = [Math]::Round(([AudioMaster]::GetVolume() * 100))
    Write-Output "Current volume: $current%"
}
