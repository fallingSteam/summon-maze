@echo off
setlocal

set "PROJECT_DIR=%~dp0godot"
set "GODOT_EXE=D:\Godot_v4.6.3-stable_win64.exe\Godot_v4.6.3-stable_win64.exe"

if not exist "%GODOT_EXE%" if exist "D:\Godot\_v4.6.3-stable\_win64.exe" set "GODOT_EXE=D:\Godot\_v4.6.3-stable\_win64.exe"

if not exist "%PROJECT_DIR%\project.godot" (
    echo [ERROR] Cannot find the Godot project:
    echo         %PROJECT_DIR%\project.godot
    pause
    exit /b 1
)

if not exist "%GODOT_EXE%" (
    echo [ERROR] Cannot find Godot 4.6.3.
    echo Please update GODOT_EXE in this file.
    echo Current path:
    echo         %GODOT_EXE%
    pause
    exit /b 1
)

start "Summon Maze" "%GODOT_EXE%" --path "%PROJECT_DIR%"
exit /b 0
