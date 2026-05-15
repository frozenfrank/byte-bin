# TMUX

## Tmux Info Shared by A Classmate
Tmux infomercial coming in hot
At first I didn't really like using tmux, I was acustomed to just using my shells built in stuff to split panes and make new windows. Then I customized it a little bit and I really starting liking switching between sessions and that I can keep web severs running in other sessions etc. etc. and it just made context switching a lot easier. Here are some articles that guided me to this point. https://hamvocke.com/blog/a-quick-and-easy-guide-to-tmux/ and https://hamvocke.com/blog/a-guide-to-customizing-your-tmux-conf/ and I think I stole this guys config more or less https://youtu.be/U-omALWIBos?t=101 (there are tons of videos on yt of people showing off way smancier tmux configs but this one was fancy and simple enough for my liking)

first make a .tmux.conf at $HOME with touch .tmux.conf

I attached two examples of the one what I use, the comments in them will explain what each thing does. The biggest changes are that I switch the prefix from ctrl + b to ctrl + a (easy one hand combo), another common thing is to change the keys for splitting panes - horizontal splits and | do vertical splits. 

I also bind prefix followed by vim nav keys (hjkl) to do pane resize as well as ctrl + vim nav keys to move arround (instead of arrow keys). You can further add a plugin to make this work with vim/neovim so it respects your window navigation within vim and tmux panes.

Add the ability to use plugins by following the install guide here:
https://github.com/tmux-plugins/tpm 
then in tmux do prefix I to install the plugins

I also add a nice theme plugin along with two plugins for making your tmux session resurrect after closing it. One for doing just that and one which saves that state every 15 mins (you can also do prefix ctrl + s do maually save state). This way if you disconnect from the lab machines all you have to do is call tmux and your panes and other tmux sessions will restore to what they were before. Also add the ability to use the mouse and if you want to copy paste you can use vim keys (v and y or mouse select and y). If you start using mouse mode and want to return to the insert mode (back to typing in commands) you can type q and that will drop you back to the bottom of your terminal and you can continue typing in shell commands.
