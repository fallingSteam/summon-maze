extends Node

static func load_json(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		push_warning("数据文件不存在: %s" % path)
		return null
	var file := FileAccess.open(path, FileAccess.READ)
	var text := file.get_as_text()
	var parsed: Variant = JSON.parse_string(text)
	if parsed == null:
		push_warning("JSON 解析失败: %s" % path)
	return parsed
