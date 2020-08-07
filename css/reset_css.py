# Reset css colors given number
import sys


if __name__ == "__main__":
    color_palatte = sys.argv[1] if len(sys.argv) > 1 else 0
    with open("colors.csv") as file:
        color_lines = file.readlines()
        names = color_lines[0][:-1].split(",")
        colors = color_lines[int(color_palatte) + 1][:-1].split(",")
    with open('main.css') as file:
        css_lines = file.readlines()
    start_line = css_lines.index("/*BEGIN COLORS*/\n") + 1
    end_line = css_lines.index("/*END COLORS*/\n")
    del css_lines[start_line:end_line]
    for name, color in zip(names, colors):
        css_lines.insert(start_line, "--" + name + "Color: #" + color + ";\n")
    with open("main.css", "w+") as new_css:
        new_css.writelines(css_lines)