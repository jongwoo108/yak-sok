@echo off
C:\yak-sok\.venv\Scripts\python.exe fix_db_with_signal.py > batch_log.txt 2>&1
echo DONE > batch_done.txt
